import { supabase } from "@/lib/db/supabase";
import type { AIDecisionAction } from "@/types";
import { buildTransactionContext } from "./context";
import { calculateRecoveryProbability } from "./scoring";
import { AIAgent } from "@/lib/ai/agent";
import { policyEngine } from "./policy-engine";
import type { FailureReason } from "@/types";

export interface RecoveryRunResult {
  recoveryCaseId: string;
  paymentId: string;
  aiDecision: any;
  policyValidation: any;
  executedAction: AIDecisionAction;
  recoveryProbability: number;
  success: boolean;
  amountRecovered: number;
  isSimulated: boolean;
  isFallback: boolean;
  timeline: { type: string; status: string; createdAt: Date }[];
}

export class RecoveryEngine {
  private agent: AIAgent;

  constructor(agent?: AIAgent) {
    this.agent = agent || new AIAgent();
  }

  async run(recoveryCaseId: string): Promise<RecoveryRunResult> {
    // Fetch recovery case with payment + customer
    const { data: rcRaw, error: rcErr } = await supabase
      .from("recovery_cases")
      .select(`
        *,
        payment:payments(*, customer:customers(*))
      `)
      .eq("id", recoveryCaseId)
      .single();

    if (rcErr || !rcRaw) throw new Error(`RecoveryCase ${recoveryCaseId} not found`);

    // Normalize snake_case -> camelCase for internal logic
    const recoveryCase: any = {
      id: (rcRaw as any).id,
      paymentId: (rcRaw as any).payment_id,
      merchantId: (rcRaw as any).merchant_id,
      status: (rcRaw as any).status,
      recoveryProbability: (rcRaw as any).recovery_probability,
      amountRecovered: (rcRaw as any).amount_recovered ?? 0,
      lastAction: (rcRaw as any).last_action,
      attemptCount: (rcRaw as any).attempt_count ?? 0,
      maxAttempts: (rcRaw as any).max_attempts ?? 3,
      createdAt: (rcRaw as any).created_at,
      updatedAt: (rcRaw as any).updated_at,
      payment: null as any,
    };

    const paymentRaw: any = (rcRaw as any).payment;
    if (!paymentRaw) throw new Error(`Payment for RecoveryCase ${recoveryCaseId} not found`);
    const customerRaw: any = paymentRaw.customer || paymentRaw.customers;
    const payment: any = {
      id: paymentRaw.id,
      merchantId: paymentRaw.merchant_id,
      customerId: paymentRaw.customer_id,
      amount: paymentRaw.amount,
      currency: paymentRaw.currency,
      paymentMethod: paymentRaw.payment_method,
      status: paymentRaw.status,
      failureReason: paymentRaw.failure_reason,
      failedAt: paymentRaw.failed_at,
      recoveredAt: paymentRaw.recovered_at,
      createdAt: paymentRaw.created_at,
      customer: {
        id: customerRaw.id,
        name: customerRaw.name,
        email: customerRaw.email,
        segment: customerRaw.segment,
        lifetimeValue: customerRaw.lifetime_value,
        totalTransactions: customerRaw.total_transactions,
        successfulTransactions: customerRaw.successful_transactions,
        previousFailures: customerRaw.previous_failures,
      },
    };
    recoveryCase.payment = payment;

    // Step 1: diagnose
    await this.recordAction(recoveryCaseId, "diagnose", "success", {
      failureReason: payment.failureReason,
      paymentMethod: payment.paymentMethod,
    });

    // Step 2: customer history
    await this.recordAction(recoveryCaseId, "get_history", "success", {
      customerId: payment.customerId,
    });

    // Step 3: build context
    const context = await buildTransactionContext(payment.id);
    if (!context) throw new Error("Failed to build transaction context");

    // Step 4: calculate probability (deterministic)
    const deterministicProb = calculateRecoveryProbability(context);
    await this.recordAction(recoveryCaseId, "calculate_probability", "success", {
      probability: deterministicProb,
    });

    // Step 5: AI decision
    const { decision, model, isFallback, error } = await this.agent.decide(context);
    const recoveryProbability = decision.recovery_probability;

    await this.recordAction(recoveryCaseId, "ai_decision", "success", {
      model,
      decision: decision.decision,
      confidence: decision.confidence,
      isFallback,
      error,
    });

    // Step 6: Policy validation
    const policyValidation = policyEngine.validate(decision, {
      failureReason: (payment.failureReason as FailureReason) || "bank_timeout",
      attemptCount: recoveryCase.attemptCount,
      maxAttempts: recoveryCase.maxAttempts,
      alreadyRecovered: recoveryCase.status === "recovered",
      customerSegment: payment.customer.segment,
      amount: payment.amount,
    });

    await this.recordAction(recoveryCaseId, "policy_validation", "success", {
      allowed: policyValidation.allowed,
      finalAction: policyValidation.finalAction,
      reason: policyValidation.reason,
      overridden: policyValidation.overridden,
    });

    // Persist AgentDecision audit
    const { error: decisionErr } = await supabase.from("agent_decisions").insert({
      recovery_case_id: recoveryCaseId,
      model,
      input_context: context as any,
      decision: decision.decision,
      confidence: decision.confidence,
      reasoning: decision.reason,
      recovery_probability: recoveryProbability,
      fallback_action: decision.fallback_action,
      max_attempts: decision.max_attempts,
      policy_verdict: policyValidation.overridden ? "overridden" : "allowed",
      policy_reason: policyValidation.reason,
      executed_action: policyValidation.finalAction,
    });
    if (decisionErr) console.warn("[engine] agentDecision insert failed", decisionErr);

    // Step 7: Update case with probability and status
    await supabase
      .from("recovery_cases")
      .update({
        recovery_probability: recoveryProbability,
        status: "in_progress",
        last_action: policyValidation.finalAction,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recoveryCaseId);

    // Step 8: Execute recovery action (simulated)
    const execution = await this.executeAction(
      recoveryCaseId,
      policyValidation.finalAction,
      recoveryProbability,
      payment.amount
    );

    // Step 9: Update recovery case based on execution result
    const success = execution.success;
    const amountRecovered = success ? payment.amount : 0;

    const newAttemptCount = recoveryCase.attemptCount + 1;
    const newStatus = success
      ? "recovered"
      : newAttemptCount >= recoveryCase.maxAttempts
        ? "failed"
        : "in_progress";

    await supabase
      .from("recovery_cases")
      .update({
        attempt_count: newAttemptCount,
        status: newStatus,
        amount_recovered: success ? amountRecovered : 0,
        last_action: policyValidation.finalAction,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recoveryCaseId);

    // Also update payment status
    if (success) {
      await supabase
        .from("payments")
        .update({ status: "recovered", recovered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", payment.id);

      // Update customer stats — increment
      const { data: cust } = await supabase
        .from("customers")
        .select("successful_transactions, total_transactions")
        .eq("id", payment.customerId)
        .single();
      if (cust) {
        await supabase
          .from("customers")
          .update({
            successful_transactions: (cust as any).successful_transactions + 1,
            total_transactions: (cust as any).total_transactions + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.customerId);
      }
    }

    const { data: timelineRaw } = await supabase
      .from("recovery_actions")
      .select("type, status, created_at")
      .eq("recovery_case_id", recoveryCaseId)
      .order("created_at", { ascending: true });

    const timeline = (timelineRaw || []).map((r: any) => ({
      type: r.type,
      status: r.status,
      createdAt: new Date(r.created_at),
    }));

    return {
      recoveryCaseId,
      paymentId: payment.id,
      aiDecision: decision,
      policyValidation,
      executedAction: policyValidation.finalAction,
      recoveryProbability,
      success,
      amountRecovered,
      isSimulated: true,
      isFallback,
      timeline,
    };
  }

  private async recordAction(
    recoveryCaseId: string,
    type: string,
    status: string,
    output?: any
  ) {
    const { data, error } = await supabase
      .from("recovery_actions")
      .insert({
        recovery_case_id: recoveryCaseId,
        type,
        status,
        output: output ? (output as any) : null,
        is_simulated: true,
      })
      .select()
      .single();
    if (error) console.warn("[engine] recordAction failed", error);
    return data;
  }

  private async executeAction(
    recoveryCaseId: string,
    action: AIDecisionAction,
    probability: number,
    amount: number
  ): Promise<{ success: boolean }> {
    const jitter = (Math.random() - 0.5) * 0.2;
    const effectiveProb = Math.max(0.05, Math.min(0.95, probability + jitter));
    const success = Math.random() < effectiveProb;

    let finalSuccess = success;
    if (action === "create_payment_link") {
      finalSuccess = Math.random() < effectiveProb * 0.92;
    } else if (action === "escalate") {
      finalSuccess = false;
    } else if (action === "send_reminder" || action === "wait_and_retry") {
      finalSuccess = false;
    }

    await this.recordAction(recoveryCaseId, action, finalSuccess ? "success" : "failed", {
      success: finalSuccess,
      amount: finalSuccess ? amount : 0,
      simulated: true,
      effectiveProbability: effectiveProb,
    });

    return { success: finalSuccess && (action === "retry_payment" || action === "create_payment_link") };
  }
}

export const recoveryEngine = new RecoveryEngine();
