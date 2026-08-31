import { supabase, isSupabaseConfigured } from "@/lib/db/supabase";
import { generateMockData, getMockKPIs } from "@/lib/mock/generate";

// ---------- helpers ----------
async function isDatabaseAvailable(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from("payments").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

// Map snake_case DB rows → camelCase app objects (keeps Prisma-like shape)
function mapCustomer(c: any) {
  if (!c) return c;
  return {
    id: c.id,
    merchantId: c.merchant_id ?? c.merchantId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    segment: c.segment,
    lifetimeValue: c.lifetime_value ?? c.lifetimeValue ?? 0,
    totalTransactions: c.total_transactions ?? c.totalTransactions ?? 0,
    successfulTransactions: c.successful_transactions ?? c.successfulTransactions ?? 0,
    previousFailures: c.previous_failures ?? c.previousFailures ?? 0,
    createdAt: c.created_at ?? c.createdAt,
    updatedAt: c.updated_at ?? c.updatedAt,
  };
}

function mapPayment(p: any) {
  if (!p) return p;
  return {
    id: p.id,
    merchantId: p.merchant_id ?? p.merchantId,
    customerId: p.customer_id ?? p.customerId,
    razorpayPaymentId: p.razorpay_payment_id ?? p.razorpayPaymentId,
    razorpayOrderId: p.razorpay_order_id ?? p.razorpayOrderId,
    amount: p.amount,
    currency: p.currency,
    paymentMethod: p.payment_method ?? p.paymentMethod,
    status: p.status,
    failureReason: p.failure_reason ?? p.failureReason ?? null,
    failedAt: p.failed_at ?? p.failedAt ?? null,
    recoveredAt: p.recovered_at ?? p.recoveredAt ?? null,
    createdAt: p.created_at ?? p.createdAt,
    updatedAt: p.updated_at ?? p.updatedAt,
    customer: p.customer ? mapCustomer(p.customer) : p.customers ? mapCustomer(p.customers) : undefined,
    // keep original snake for analytics fallback that reads .createdAt as string
  };
}

function mapRecoveryCase(rc: any) {
  if (!rc) return rc;
  return {
    id: rc.id,
    paymentId: rc.payment_id ?? rc.paymentId,
    merchantId: rc.merchant_id ?? rc.merchantId,
    status: rc.status,
    recoveryProbability: rc.recovery_probability ?? rc.recoveryProbability ?? null,
    amountRecovered: rc.amount_recovered ?? rc.amountRecovered ?? 0,
    lastAction: rc.last_action ?? rc.lastAction ?? null,
    attemptCount: rc.attempt_count ?? rc.attemptCount ?? 0,
    maxAttempts: rc.max_attempts ?? rc.maxAttempts ?? 3,
    createdAt: rc.created_at ?? rc.createdAt,
    updatedAt: rc.updated_at ?? rc.updatedAt,
    payment: rc.payment ? mapPaymentWithCustomer(rc.payment) : rc.payments ? mapPaymentWithCustomer(rc.payments) : undefined,
    decisions: (rc.decisions ?? rc.agent_decisions ?? [])?.map(mapAgentDecision),
    actions: (rc.actions ?? rc.recovery_actions ?? [])?.map(mapRecoveryAction),
  };
}

function mapPaymentWithCustomer(p: any) {
  if (!p) return p;
  const mapped = mapPayment(p);
  // customer may be nested as `customers` from join or `customer`
  const custRaw = p.customer ?? p.customers ?? p.customer_rel;
  if (custRaw) mapped.customer = mapCustomer(custRaw);
  return mapped;
}

function mapAgentDecision(d: any) {
  if (!d) return d;
  return {
    id: d.id,
    recoveryCaseId: d.recovery_case_id ?? d.recoveryCaseId,
    model: d.model,
    inputContext: d.input_context ?? d.inputContext,
    decision: d.decision,
    confidence: d.confidence,
    reasoning: d.reasoning,
    recoveryProbability: d.recovery_probability ?? d.recoveryProbability,
    fallbackAction: d.fallback_action ?? d.fallbackAction ?? null,
    maxAttempts: d.max_attempts ?? d.maxAttempts ?? 2,
    policyVerdict: d.policy_verdict ?? d.policyVerdict,
    policyReason: d.policy_reason ?? d.policyReason ?? null,
    executedAction: d.executed_action ?? d.executedAction,
    createdAt: d.created_at ?? d.createdAt,
  };
}

function mapRecoveryAction(a: any) {
  if (!a) return a;
  return {
    id: a.id,
    recoveryCaseId: a.recovery_case_id ?? a.recoveryCaseId,
    type: a.type,
    status: a.status,
    input: a.input ?? null,
    output: a.output ?? null,
    isSimulated: a.is_simulated ?? a.isSimulated ?? true,
    createdAt: a.created_at ?? a.createdAt,
  };
}

// ---------- KPIs ----------
export async function getKPIs() {
  const available = await isDatabaseAvailable();
  if (!available) {
    return getMockKPIs();
  }

  try {
    const { count: failedCount } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .in("status", ["failed", "recovered"]);

    const { count: recoveredCount } = await supabase
      .from("recovery_cases")
      .select("id", { count: "exact", head: true })
      .eq("status", "recovered");

    const { data: failedPayments } = await supabase
      .from("payments")
      .select("amount")
      .in("status", ["failed", "recovered"]);

    const { data: recoveredCases } = await supabase
      .from("recovery_cases")
      .select("amount_recovered")
      .eq("status", "recovered");

    const { count: totalPayments } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true });

    const revenueAtRisk = (failedPayments || []).reduce((a, p) => a + (p.amount || 0), 0);
    const revenueRecovered = (recoveredCases || []).reduce((a, c) => a + (c.amount_recovered || 0), 0);
    const failedPaymentsNum = failedCount || 0;
    const successfulRecoveries = recoveredCount || 0;
    const recoveryRate = failedPaymentsNum > 0 ? (successfulRecoveries / failedPaymentsNum) * 100 : 0;
    const avgRecovery = successfulRecoveries > 0 ? revenueRecovered / successfulRecoveries : 0;

    return {
      revenueAtRisk,
      revenueRecovered,
      recoveryRate: Math.round(recoveryRate * 10) / 10,
      failedPayments: failedPaymentsNum,
      successfulRecoveries,
      averageRecoveryAmount: Math.round(avgRecovery),
      totalPayments: totalPayments || 0,
    };
  } catch {
    return getMockKPIs();
  }
}

export async function getPayments(opts?: { take?: number; skip?: number; status?: string; method?: string; failureReason?: string }) {
  const available = await isDatabaseAvailable();
  if (!available) {
    const { payments } = generateMockData();
    let filtered = payments;
    if (opts?.status) filtered = filtered.filter(p => p.status===opts.status);
    if (opts?.method) filtered = filtered.filter(p => p.paymentMethod===opts.method);
    if (opts?.failureReason) filtered = filtered.filter(p => p.failureReason===opts.failureReason);
    filtered = filtered.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered.slice(opts?.skip || 0, (opts?.skip || 0)+(opts?.take || 20));
  }
  try {
    let query = supabase
      .from("payments")
      .select("*, customer:customers(*)")
      .order("created_at", { ascending: false })
      .range(opts?.skip || 0, (opts?.skip || 0) + (opts?.take || 20) - 1);

    if (opts?.status) query = query.eq("status", opts.status);
    if (opts?.method) query = query.eq("payment_method", opts.method);
    if (opts?.failureReason) query = query.eq("failure_reason", opts.failureReason);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapPayment);
  } catch {
    const { payments } = generateMockData();
    return payments.slice(0, opts?.take || 20);
  }
}

export async function getRecoveryCases(opts?: { take?: number; status?: string }) {
  const available = await isDatabaseAvailable();
  if (!available) {
    const { recoveryCases } = generateMockData();
    let filtered = recoveryCases;
    if (opts?.status) filtered = filtered.filter(r=>r.status===opts.status);
    filtered = filtered.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered.slice(0, opts?.take || 20);
  }
  try {
    let query = supabase
      .from("recovery_cases")
      .select(`
        *,
        payment:payments(*, customer:customers(*)),
        decisions:agent_decisions(*),
        actions:recovery_actions(*)
      `)
      .order("created_at", { ascending: false })
      .limit(opts?.take || 20);

    if (opts?.status) query = query.eq("status", opts.status);

    const { data, error } = await query;
    if (error) throw error;

    // Supabase returns actions unordered; sort by created_at asc
    const mapped = (data || []).map((rc: any) => {
      const m = mapRecoveryCase(rc);
      if (m.actions) m.actions = m.actions.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return m;
    });
    return mapped;
  } catch {
    const { recoveryCases } = generateMockData();
    return recoveryCases.slice(0, opts?.take || 20);
  }
}

export async function getAnalytics() {
  const available = await isDatabaseAvailable();
  if (!available) {
    const { payments, recoveryCases } = generateMockData();
    return buildAnalytics(payments as any, recoveryCases as any);
  }
  try {
    const { data: paymentsRaw } = await supabase
      .from("payments")
      .select("*, customer:customers(*)")
      .limit(1000);
    const { data: casesRaw } = await supabase
      .from("recovery_cases")
      .select("*, payment:payments(*, customer:customers(*))")
      .limit(1000);

    const payments = (paymentsRaw || []).map(mapPayment);
    const cases = (casesRaw || []).map(mapRecoveryCase);
    return buildAnalytics(payments, cases);
  } catch {
    const { payments, recoveryCases } = generateMockData();
    return buildAnalytics(payments as any, recoveryCases as any);
  }
}

function buildAnalytics(payments: any[], cases: any[]) {
  // Failure reason distribution
  const failureCounts: Record<string, number> = {};
  payments.filter(p=>p.failureReason).forEach(p=>{ failureCounts[p.failureReason]=(failureCounts[p.failureReason]||0)+1; });
  const failureDistribution = Object.entries(failureCounts).map(([name,value])=>({ name, value }));

  // By payment method
  const methodStats: Record<string, {total: number, recovered: number}> = {};
  payments.forEach(p=>{
    if(!methodStats[p.paymentMethod]) methodStats[p.paymentMethod]={total:0, recovered:0};
    methodStats[p.paymentMethod].total++;
    if(p.status==="recovered") methodStats[p.paymentMethod].recovered++;
  });
  const byMethod = Object.entries(methodStats).map(([method, stats])=>({
    method,
    total: stats.total,
    recovered: stats.recovered,
    rate: stats.total? Math.round((stats.recovered/stats.total)*100):0,
  }));

  // By customer segment (mock needs segment from customer)
  const segmentStats: Record<string, {total:number, recovered:number}> = {};
  cases.forEach(c=>{
    const seg = c.payment?.customer?.segment || "returning";
    if(!segmentStats[seg]) segmentStats[seg]={total:0, recovered:0};
    segmentStats[seg].total++;
    if(c.status==="recovered") segmentStats[seg].recovered++;
  });
  const bySegment = Object.entries(segmentStats).map(([segment, stats])=>({
    segment,
    total: stats.total,
    recovered: stats.recovered,
    rate: stats.total? Math.round((stats.recovered/stats.total)*100):0,
  }));

  // Recovery trend (last 14 days)
  const trend: { date: string; recovered: number; atRisk: number }[] = [];
  for(let i=13;i>=0;i--){
    const d = new Date();
    d.setDate(d.getDate()-i);
    const dateStr = d.toISOString().slice(0,10);
    const dayPayments = payments.filter(p=>{
      const created = (p.createdAt || "").slice(0,10);
      return created === dateStr;
    });
    const recovered = cases.filter(c=>c.status==="recovered" && (c.updatedAt || "").slice(0,10)===dateStr).reduce((a,c)=>a+c.amountRecovered,0);
    const atRisk = dayPayments.filter(p=>p.failureReason).reduce((a,p)=>a+p.amount,0);
    trend.push({ date: dateStr.slice(5), recovered: Math.round(recovered/100), atRisk: Math.round(atRisk/100) });
  }

  // AI actions vs success (mock)
  const actionStats: Record<string, {total: number, success: number}> = {};
  cases.forEach(c=>{
    const action = c.lastAction || "retry_payment";
    if(!actionStats[action]) actionStats[action]={total:0, success:0};
    actionStats[action].total++;
    if(c.status==="recovered") actionStats[action].success++;
  });
  const byAction = Object.entries(actionStats).map(([action, stats])=>({ action, total: stats.total, success: stats.success, rate: Math.round((stats.success/stats.total)*100) }));

  return { failureDistribution, byMethod, bySegment, trend, byAction };
}
