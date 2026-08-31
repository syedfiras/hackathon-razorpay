// Server-side tool definitions — autonomous agent tools (simulated/real)
import { supabase } from "@/lib/db/supabase";
import type { TransactionContext } from "@/types";

export const toolDefinitions = [
  {
    name: "get_payment",
    description: "Fetch payment by ID with failure details",
  },
  {
    name: "get_customer_history",
    description: "Fetch customer transaction history and lifetime value",
  },
  {
    name: "get_failure_details",
    description: "Get failure reason and gateway response",
  },
  {
    name: "calculate_recovery_probability",
    description: "Calculate deterministic recovery probability",
  },
  {
    name: "retry_payment",
    description: "Retry the failed payment (simulated or via Razorpay test)",
  },
  {
    name: "create_payment_link",
    description: "Create Razorpay payment link for recovery",
  },
  {
    name: "send_recovery_message",
    description: "Send recovery reminder to customer (simulated in-app)",
  },
  {
    name: "escalate_recovery_case",
    description: "Escalate case for manual review",
  },
  {
    name: "record_recovery_action",
    description: "Record recovery action to audit trail",
  },
  {
    name: "record_recovery_result",
    description: "Record recovery outcome and update analytics",
  },
] as const;

// Implementations — used by engine.ts
export async function getPayment(paymentId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      failure_events:failure_events(*),
      attempts:payment_attempts(*)
    `)
    .eq("id", paymentId)
    .single();
  if (error) return null;
  return data;
}

export async function getCustomerHistory(customerId: string) {
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();
  if (error || !customer) return null;
  const { data: recentPayments } = await supabase
    .from("payments")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(10);
  const recentFailures = (recentPayments || []).filter((p: any) => p.status === "failed").length;

  // Count recovered cases for this customer via payment join
  const { data: paymentsForCustomer } = await supabase
    .from("payments")
    .select("id")
    .eq("customer_id", customerId);
  const paymentIds = (paymentsForCustomer || []).map((p: any) => p.id);
  let recoveryCases = 0;
  if (paymentIds.length > 0) {
    const { count } = await supabase
      .from("recovery_cases")
      .select("id", { count: "exact", head: true })
      .in("payment_id", paymentIds)
      .eq("status", "recovered");
    recoveryCases = count || 0;
  }
  return { customer, recentPayments: recentPayments || [], recentFailures, recoveryCases };
}

export async function getFailureDetails(paymentId: string) {
  const { data } = await supabase
    .from("failure_events")
    .select("*")
    .eq("payment_id", paymentId)
    .order("created_at", { ascending: false });
  return data || [];
}

export function calculateRecoveryProbability(ctx: TransactionContext): number {
  const baseMap: Record<string, number> = {
    bank_timeout: 0.85,
    upi_failure: 0.6,
    insufficient_funds: 0.55,
    card_declined: 0.45,
    expired_card: 0.3,
  };
  let score = baseMap[ctx.transaction.failure_reason] ?? 0.5;
  const successRate =
    ctx.customer.total_transactions > 0
      ? ctx.customer.successful_transactions / ctx.customer.total_transactions
      : 0.5;
  score += Math.min(successRate * 0.2, 0.15);
  if (ctx.customer.segment === "high_value") score += 0.1;
  if (ctx.customer.segment === "returning") score += 0.05;
  if (ctx.customer.segment === "at_risk") score -= 0.1;
  score -= ctx.transaction.attempt_count * 0.12;
  if (ctx.transaction.amount > 1000000) score -= 0.05; // >10k
  return Math.max(0.05, Math.min(0.95, Math.round(score * 100) / 100));
}
