import { supabase } from "@/lib/db/supabase";
import type { TransactionContext, FailureReason, PaymentMethod } from "@/types";

export async function buildTransactionContext(paymentId: string): Promise<TransactionContext | null> {
  const { data: paymentRaw, error } = await supabase
    .from("payments")
    .select(`
      *,
      customer:customers(*),
      recoveryCase:recovery_cases(*)
    `)
    .eq("id", paymentId)
    .single();

  if (error || !paymentRaw) return null;

  // Supabase may return recoveryCase as array if relation is 1:1 via unique constraint
  const recoveryCaseRaw = Array.isArray((paymentRaw as any).recoveryCase) ? (paymentRaw as any).recoveryCase[0] : (paymentRaw as any).recoveryCase;
  const customerRaw = (paymentRaw as any).customer || (paymentRaw as any).customers;
  if (!customerRaw) return null;

  // Recent history: need to handle supabase relation alternative query for recoveryCases by customer
  const { data: recentPaymentsRaw } = await supabase
    .from("payments")
    .select("*")
    .eq("customer_id", customerRaw.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const recentFailures = (recentPaymentsRaw || []).filter((p: any) => p.status === "failed").length;

  // Recovery cases for this customer's payments: join via payments -> recovery_cases
  // Fetch all payments ids for customer then query recovery_cases
  const paymentIds = (recentPaymentsRaw || []).map((p: any) => p.id);
  let recoveryCases: any[] = [];
  if (paymentIds.length > 0) {
    const { data: rcData } = await supabase
      .from("recovery_cases")
      .select("status")
      .in("payment_id", paymentIds);
    recoveryCases = rcData || [];
  }
  // If no recent payments, fallback to query via join through payments table
  if (recoveryCases.length === 0 && paymentIds.length === 0) {
    const { data: allPaymentsForCustomer } = await supabase
      .from("payments")
      .select("id")
      .eq("customer_id", customerRaw.id);
    const ids = (allPaymentsForCustomer || []).map((p: any) => p.id);
    if (ids.length > 0) {
      const { data: rc2 } = await supabase
        .from("recovery_cases")
        .select("status")
        .in("payment_id", ids);
      recoveryCases = rc2 || [];
    }
  }

  const recovered = recoveryCases.filter((c: any) => c.status === "recovered").length;
  const recoveryRate = recoveryCases.length > 0 ? recovered / recoveryCases.length : 0;

  const createdAt = (paymentRaw as any).created_at ? new Date((paymentRaw as any).created_at).toISOString() : new Date().toISOString();

  return {
    transaction: {
      id: (paymentRaw as any).id,
      amount: (paymentRaw as any).amount,
      currency: (paymentRaw as any).currency,
      payment_method: ((paymentRaw as any).payment_method as PaymentMethod),
      failure_reason: (((paymentRaw as any).failure_reason as FailureReason) || "bank_timeout"),
      created_at: createdAt,
      attempt_count: (recoveryCaseRaw?.attempt_count ?? recoveryCaseRaw?.attemptCount ?? 0),
    },
    customer: {
      id: customerRaw.id,
      name: customerRaw.name,
      email: customerRaw.email,
      total_transactions: customerRaw.total_transactions ?? customerRaw.totalTransactions ?? 0,
      successful_transactions: customerRaw.successful_transactions ?? customerRaw.successfulTransactions ?? 0,
      previous_failures: customerRaw.previous_failures ?? customerRaw.previousFailures ?? 0,
      lifetime_value: customerRaw.lifetime_value ?? customerRaw.lifetimeValue ?? 0,
      segment: customerRaw.segment,
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
