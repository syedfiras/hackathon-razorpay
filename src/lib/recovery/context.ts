import { prisma } from "@/lib/db/prisma";
import type { TransactionContext, FailureReason, PaymentMethod } from "@/types";

export async function buildTransactionContext(paymentId: string): Promise<TransactionContext | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { customer: true, recoveryCase: true },
  });
  if (!payment) return null;

  const customer = payment.customer;

  // Recent history
  const recentPayments = await prisma.payment.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const recentFailures = recentPayments.filter((p) => p.status === "failed").length;
  const recoveryCases = await prisma.recoveryCase.findMany({
    where: { payment: { customerId: customer.id } },
  });
  const recovered = recoveryCases.filter((c) => c.status === "recovered").length;
  const recoveryRate = recoveryCases.length > 0 ? recovered / recoveryCases.length : 0;

  return {
    transaction: {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      payment_method: payment.paymentMethod as PaymentMethod,
      failure_reason: (payment.failureReason as FailureReason) || "bank_timeout",
      created_at: payment.createdAt.toISOString(),
      attempt_count: payment.recoveryCase?.attemptCount ?? 0,
    },
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      total_transactions: customer.totalTransactions,
      successful_transactions: customer.successfulTransactions,
      previous_failures: customer.previousFailures,
      lifetime_value: customer.lifetimeValue,
      segment: customer.segment,
    },
    history: {
      recent_failures: recentFailures,
      recovery_rate: Math.round(recoveryRate * 100) / 100,
    },
  };
}

export function buildMockContext(overrides?: Partial<TransactionContext>): TransactionContext {
  return {
    transaction: {
      id: `TXN_${Math.floor(Math.random() * 900000 + 100000)}`,
      amount: 499900,
      currency: "INR",
      payment_method: "upi",
      failure_reason: "bank_timeout",
      created_at: new Date().toISOString(),
      attempt_count: 0,
      ...overrides?.transaction,
    },
    customer: {
      id: `CUS_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      name: "Rahul Sharma",
      email: "rahul@example.com",
      total_transactions: 14,
      successful_transactions: 12,
      previous_failures: 2,
      lifetime_value: 4890000,
      segment: "returning",
      ...overrides?.customer,
    },
    history: {
      recent_failures: 1,
      recovery_rate: 0.85,
      ...overrides?.history,
    },
  };
}
