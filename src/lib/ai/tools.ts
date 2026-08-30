// Server-side tool definitions — autonomous agent tools (simulated/real)
import { prisma } from "@/lib/db/prisma";
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
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: { failureEvents: true, attempts: true },
  });
}

export async function getCustomerHistory(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) return null;
  const recentPayments = await prisma.payment.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const recentFailures = recentPayments.filter((p) => p.status === "failed").length;
  const recoveryCases = await prisma.recoveryCase.count({
    where: { payment: { customerId }, status: "recovered" },
  });
  return { customer, recentPayments, recentFailures, recoveryCases };
}

export async function getFailureDetails(paymentId: string) {
  return prisma.failureEvent.findMany({
    where: { paymentId },
    orderBy: { createdAt: "desc" },
  });
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
