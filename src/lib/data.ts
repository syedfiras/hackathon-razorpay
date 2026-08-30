import { prisma } from "@/lib/db/prisma";
import { generateMockData, getMockKPIs } from "@/lib/mock/generate";

// Helper to check if DB is reachable, else fallback to mock
async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function getKPIs() {
  const available = await isDatabaseAvailable();
  if (!available) {
    return getMockKPIs();
  }

  try {
    const failedPayments = await prisma.payment.count({
      where: { status: { in: ["failed", "recovered"] } },
    });
    const successfulRecoveries = await prisma.recoveryCase.count({
      where: { status: "recovered" },
    });
    const failedAgg = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: { in: ["failed", "recovered"] } },
    });
    const recoveredAgg = await prisma.recoveryCase.aggregate({
      _sum: { amountRecovered: true },
      where: { status: "recovered" },
    });
    const totalPayments = await prisma.payment.count();

    const revenueAtRisk = failedAgg._sum.amount || 0;
    const revenueRecovered = recoveredAgg._sum.amountRecovered || 0;
    const recoveryRate = failedPayments > 0 ? (successfulRecoveries / failedPayments) * 100 : 0;
    const avgRecovery = successfulRecoveries > 0 ? revenueRecovered / successfulRecoveries : 0;

    return {
      revenueAtRisk,
      revenueRecovered,
      recoveryRate: Math.round(recoveryRate * 10) / 10,
      failedPayments,
      successfulRecoveries,
      averageRecoveryAmount: Math.round(avgRecovery),
      totalPayments,
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
    return await prisma.payment.findMany({
      where: {
        ...(opts?.status ? { status: opts.status } : {}),
        ...(opts?.method ? { paymentMethod: opts.method } : {}),
        ...(opts?.failureReason ? { failureReason: opts.failureReason } : {}),
      },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: opts?.take || 20,
      skip: opts?.skip || 0,
    });
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
    return await prisma.recoveryCase.findMany({
      where: { ...(opts?.status ? { status: opts.status } : {}) },
      include: { payment: { include: { customer: true } }, decisions: true, actions: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: opts?.take || 20,
    });
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
    const payments = await prisma.payment.findMany({ include: { customer: true } });
    const cases = await prisma.recoveryCase.findMany({ include: { payment: true } });
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
    const dayPayments = payments.filter(p=>p.createdAt.slice(0,10)===dateStr);
    const recovered = cases.filter(c=>c.status==="recovered" && c.updatedAt.slice(0,10)===dateStr).reduce((a,c)=>a+c.amountRecovered,0);
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
