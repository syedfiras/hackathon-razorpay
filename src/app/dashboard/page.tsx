import { getKPIs, getRecoveryCases, getAnalytics } from "@/lib/data";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { RevenueTrend } from "@/components/dashboard/RevenueTrend";
import { FailureDonut } from "@/components/dashboard/FailureDonut";
import { PaymentMethodBar } from "@/components/dashboard/PaymentMethodBar";
import { RecentActions } from "@/components/dashboard/RecentActions";
import { SimulateButton } from "@/components/demo/SimulateButton";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [kpis, cases, analytics] = await Promise.all([
    getKPIs(),
    getRecoveryCases({ take: 6 }),
    getAnalytics(),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-zinc-500 mt-1">Autonomous revenue recovery — Detect → Diagnose → Decide → Act → Measure</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-white text-xs">Last 30 days • Auto-refresh</Badge>
          <SimulateButton />
        </div>
      </div>

      <KpiCards kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RevenueTrend data={analytics.trend} />
        <FailureDonut data={analytics.failureDistribution} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PaymentMethodBar data={analytics.byMethod} />
        <div className="lg:col-span-2">
          <RecentActions cases={cases as any[]} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold text-sm">Recovery by Customer Segment</h3>
          <p className="text-xs text-zinc-500 mb-4">Rate per segment</p>
          <div className="space-y-3">
            {analytics.bySegment.map((s: any) => (
              <div key={s.segment} className="flex items-center justify-between">
                <div className="text-sm capitalize">{s.segment.replace(/_/g," ")}</div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.rate}%` }} />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">{s.rate}%</span>
                  <span className="text-xs text-zinc-500">{s.recovered}/{s.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold text-sm">AI Actions vs Success</h3>
          <p className="text-xs text-zinc-500 mb-4">Which strategy recovers most</p>
          <div className="space-y-3">
            {analytics.byAction.map((a: any) => (
              <div key={a.action} className="flex items-center justify-between">
                <div className="text-sm capitalize">{a.action.replace(/_/g," ")}</div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${a.rate}%` }} />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">{a.rate}%</span>
                  <span className="text-xs text-zinc-500">{a.success}/{a.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
