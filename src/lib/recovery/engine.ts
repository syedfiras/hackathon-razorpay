import { prisma } from "@/lib/db/prisma";
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
    const recoveryCase = await prisma.recoveryCase.findUnique({
      where: { id: recoveryCaseId },
      include: { payment: { include: { customer: true } } },
    });
    if (!recoveryCase) throw new Error(`RecoveryCase ${recoveryCaseId} not found`);

    const payment = recoveryCase.payment;

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
    // Use deterministic prob as sanity if AI prob wildly off? Keep AI prob but log
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
    await prisma.agentDecision.create({
      data: {
        recoveryCaseId,
        model,
        inputContext: context as any,
        decision: decision.decision,
        confidence: decision.confidence,
        reasoning: decision.reason,
        recoveryProbability,
        fallbackAction: decision.fallback_action,
        maxAttempts: decision.max_attempts,
        policyVerdict: policyValidation.overridden ? "overridden" : "allowed",
        policyReason: policyValidation.reason,
        executedAction: policyValidation.finalAction,
      },
    });

    // Step 7: Update case with probability and status
    await prisma.recoveryCase.update({
      where: { id: recoveryCaseId },
      data: {
        recoveryProbability,
        status: "in_progress",
        lastAction: policyValidation.finalAction,
      },
    });

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

    await prisma.recoveryCase.update({
      where: { id: recoveryCaseId },
      data: {
        attemptCount: { increment: 1 },
        status: success ? "recovered" : recoveryCase.attemptCount + 1 >= recoveryCase.maxAttempts ? "failed" : "in_progress",
        amountRecovered: success ? amountRecovered : 0,
        lastAction: policyValidation.finalAction,
      },
    });

    // Also update payment status
    if (success) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "recovered", recoveredAt: new Date() },
      });
      // Update customer stats
      await prisma.customer.update({
        where: { id: payment.customerId },
        data: {
          successfulTransactions: { increment: 1 },
          totalTransactions: { increment: 1 },
        },
      });
    }

    // If failed but not terminal, we leave in_progress for next retry; else mark failed

    const timeline = await prisma.recoveryAction.findMany({
      where: { recoveryCaseId },
      orderBy: { createdAt: "asc" },
      select: { type: true, status: true, createdAt: true },
    });

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
    return prisma.recoveryAction.create({
      data: {
        recoveryCaseId,
        type,
        status,
        output: output ? (output as any) : undefined,
        isSimulated: true,
      },
    });
  }

  private async executeAction(
    recoveryCaseId: string,
    action: AIDecisionAction,
    probability: number,
    amount: number
  ): Promise<{ success: boolean }> {
    // Simulate processing delay
    // Weighted success by probability with slight randomness
    // For demo: add small variance so 87% doesn't always succeed
    const jitter = (Math.random() - 0.5) * 0.2; // -0.1 .. +0.1
    const effectiveProb = Math.max(0.05, Math.min(0.95, probability + jitter));
    const success = Math.random() < effectiveProb;

    // Special cases: expired_card never succeeds on retry, but link may succeed at lower rate
    // We already policy-block retry, but handle here for safety
    let finalSuccess = success;
    if (action === "create_payment_link") {
      // Payment link success is slightly lower than retry for transient failures
      finalSuccess = Math.random() < effectiveProb * 0.92;
    } else if (action === "escalate") {
      finalSuccess = false;
    } else if (action === "send_reminder" || action === "wait_and_retry") {
      finalSuccess = false; // these are intermediate, not final recovery
    }

    await this.recordAction(recoveryCaseId, action, finalSuccess ? "success" : "failed", {
      success: finalSuccess,
      amount: finalSuccess ? amount : 0,
      simulated: true,
      effectiveProbability: effectiveProb,
    });

    // If send_reminder / wait_and_retry, also simulate that they are pending states, not recovered
    // But for demo we treat wait_and_retry as failed for now to allow next step

    return { success: finalSuccess && (action === "retry_payment" || action === "create_payment_link") };
  }
}

export const recoveryEngine = new RecoveryEngine();
