import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase, isSupabaseConfigured } from "@/lib/db/supabase";
import { buildTransactionContext } from "@/lib/recovery/context";
import { calculateRecoveryProbability } from "@/lib/recovery/scoring";
import { AIAgent } from "@/lib/ai/agent";
import { policyEngine } from "@/lib/recovery/policy-engine";
import type { FailureReason, PaymentMethod } from "@/types";

const schema = z.object({
  amount: z.number().min(100).max(10000000),
  failureReason: z.enum(["insufficient_funds","bank_timeout","card_declined","expired_card","upi_failure"]),
  paymentMethod: z.enum(["upi","card","netbanking","wallet"]),
  customerName: z.string().optional(),
});

// Helper to test DB
async function canUseDB(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from("payments").select("id").limit(1);
    return !error;
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if(!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const { amount, failureReason, paymentMethod } = parsed.data;

    const useDB = await canUseDB();

    if (!useDB) {
      // Mock mode — no DB persistence, just simulate recovery decision
      const { AIAgent: Agent } = await import("@/lib/ai/agent");
      const { buildMockContext } = await import("@/lib/recovery/context");
      const { calculateRecoveryProbability } = await import("@/lib/recovery/scoring");

      const mockCtx = buildMockContext({
        transaction: {
          id: `TXN_${Date.now()}`,
          amount,
          currency: "INR",
          payment_method: paymentMethod as PaymentMethod,
          failure_reason: failureReason as FailureReason,
          created_at: new Date().toISOString(),
          attempt_count: 0,
        },
        customer: {
          id: `CUS_${Math.random().toString(36).slice(2,6).toUpperCase()}`,
          name: parsed.data.customerName || "Rahul Sharma",
          email: "rahul@example.com",
          total_transactions: 14,
          successful_transactions: 12,
          previous_failures: 2,
          lifetime_value: 4890000,
          segment: "returning",
        },
        history: { recent_failures: 1, recovery_rate: 0.85 }
      });

      const detProb = calculateRecoveryProbability(mockCtx);
      const agent = new Agent();
      const { decision, model, isFallback } = await agent.decide(mockCtx);
      const policy = policyEngine.validate(decision, {
        failureReason: failureReason as FailureReason,
        attemptCount: 0, maxAttempts: 3, alreadyRecovered: false
      });

      const effectiveProb = decision.recovery_probability + (Math.random()-0.5)*0.1;
      const success = Math.random() < effectiveProb && (policy.finalAction==="retry_payment" || policy.finalAction==="create_payment_link");

      return NextResponse.json({
        success,
        simulated: true,
        paymentId: mockCtx.transaction.id,
        recoveryCaseId: `rc_${Date.now()}`,
        amount,
        amountRecovered: success ? amount : 0,
        decision: decision.decision,
        executedAction: policy.finalAction,
        confidence: decision.confidence,
        recoveryProbability: decision.recovery_probability,
        deterministicProb: detProb,
        reason: decision.reason,
        policyReason: policy.reason,
        model,
        isFallback,
        timeline: [
          { type:"diagnose", status:"success", createdAt: new Date().toISOString() },
          { type:"get_history", status:"success", createdAt: new Date(Date.now()+1000).toISOString() },
          { type:"calculate_probability", status:"success", createdAt: new Date(Date.now()+2000).toISOString() },
          { type:"ai_decision", status:"success", createdAt: new Date(Date.now()+3000).toISOString() },
          { type:"policy_validation", status:"success", createdAt: new Date(Date.now()+4000).toISOString() },
          { type: policy.finalAction, status: success? "success":"failed", createdAt: new Date(Date.now()+5000).toISOString() },
        ],
        message: "Simulated (no DB) — data not persisted. Connect Supabase to persist."
      });
    }

    // DB mode — create real records and run engine
    // Find or create a demo customer via Supabase ilike
    let customer: any = null;
    const { data: foundCustomers } = await supabase
      .from("customers")
      .select("*")
      .ilike("email", "%rahul%")
      .limit(1);
    if (foundCustomers && foundCustomers.length > 0) {
      customer = foundCustomers[0];
    }
    if(!customer){
      const { data: merchants } = await supabase.from("merchants").select("*").limit(1);
      const merchant = merchants?.[0];
      if(!merchant) return NextResponse.json({ error: "No merchant found. Run seed."}, { status: 500 });
      const { data: newCustomer, error } = await supabase
        .from("customers")
        .insert({
          merchant_id: merchant.id,
          name: parsed.data.customerName || "Rahul Sharma",
          email: `rahul.sharma+${Date.now()}@example.com`,
          phone: "+919876543210",
          segment: "returning",
          lifetime_value: 4890000,
          total_transactions: 14,
          successful_transactions: 12,
          previous_failures: 2,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      customer = newCustomer;
    }

    const merchantId = (customer as any).merchant_id;
    const customerId = (customer as any).id;

    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        merchant_id: merchantId,
        customer_id: customerId,
        razorpay_payment_id: `pay_${Math.random().toString(36).slice(2,12)}`,
        razorpay_order_id: `order_${Math.random().toString(36).slice(2,12)}`,
        amount,
        currency: "INR",
        payment_method: paymentMethod,
        status: "failed",
        failure_reason: failureReason,
        failed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (payErr) throw new Error(payErr.message);

    await supabase.from("payment_attempts").insert({
      payment_id: (payment as any).id,
      attempt_no: 1,
      status: "failed",
      error_code: failureReason,
      gateway_response: { error: failureReason, simulated: true },
    });

    await supabase.from("failure_events").insert({
      payment_id: (payment as any).id,
      code: failureReason,
      reason: failureReason.replace(/_/g," "),
      gateway_response: { simulated: true, reason: failureReason },
    });

    const { data: recoveryCase, error: rcErr } = await supabase
      .from("recovery_cases")
      .insert({
        payment_id: (payment as any).id,
        merchant_id: merchantId,
        status: "open",
        attempt_count: 0,
        max_attempts: 3,
        last_action: "pending",
      })
      .select()
      .single();
    if (rcErr) throw new Error(rcErr.message);

    // Run recovery engine
    const { recoveryEngine } = await import("@/lib/recovery/engine");
    const result = await recoveryEngine.run((recoveryCase as any).id);

    return NextResponse.json({
      success: result.success,
      simulated: true,
      paymentId: (payment as any).id,
      recoveryCaseId: (recoveryCase as any).id,
      amount,
      amountRecovered: result.amountRecovered,
      decision: result.aiDecision.decision,
      executedAction: result.executedAction,
      confidence: result.aiDecision.confidence,
      recoveryProbability: result.recoveryProbability,
      reason: result.aiDecision.reason,
      policyReason: result.policyValidation.reason,
      timeline: result.timeline,
      isFallback: result.isFallback,
    });

  } catch (e:any) {
    console.error("[simulate-failure]", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
