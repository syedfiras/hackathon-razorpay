import { getAnalytics, getKPIs } from "@/lib/data";
import { RevenueTrend } from "@/components/dashboard/RevenueTrend";
import { FailureDonut } from "@/components/dashboard/FailureDonut";
import { PaymentMethodBar } from "@/components/dashboard/PaymentMethodBar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [analytics, kpis] = await Promise.all([getAnalytics(), getKPIs()]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-zinc-500 mt-1">Recovery performance deep-dive — all simulated test data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RevenueTrend data={analytics.trend} />
        <FailureDonut data={analytics.failureDistribution} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PaymentMethodBar data={analytics.byMethod} />
        <Card>
          <CardHeader>
            <CardTitle>Recovery Rate Over Time</CardTitle>
            <CardDescription>Trend from last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.trend.map((t:any)=>(
                <div key={t.date} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">{t.date}</span>
                  <span className="font-medium">Rec ₹{t.recovered} / Risk ₹{t.atRisk}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.recovered> t.atRisk*0.5 ?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{t.recovered && t.atRisk ? Math.round((t.recovered/t.atRisk)*100):0}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>By Customer Segment</CardTitle><CardDescription>Who recovers best</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {analytics.bySegment.map((s:any)=>(
              <div key={s.segment} className="flex items-center justify-between">
                <span className="capitalize text-sm">{s.segment}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{width:`${s.rate}%`}}/></div>
                  <span className="text-sm font-medium">{s.rate}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>AI Action Success</CardTitle><CardDescription>Which strategy works</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {analytics.byAction.map((a:any)=>(
              <div key={a.action} className="flex items-center justify-between">
                <span className="capitalize text-sm">{a.action.replace(/_/g," ")}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-sky-500" style={{width:`${a.rate}%`}}/></div>
                  <span className="text-sm font-medium">{a.rate}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>KPIs Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><div className="text-zinc-500">Revenue At Risk</div><div className="font-semibold">₹{(kpis.revenueAtRisk/100).toLocaleString("en-IN")}</div></div>
          <div><div className="text-zinc-500">Revenue Recovered</div><div className="font-semibold text-emerald-600">₹{(kpis.revenueRecovered/100).toLocaleString("en-IN")}</div></div>
          <div><div className="text-zinc-500">Recovery Rate</div><div className="font-semibold">{kpis.recoveryRate}%</div></div>
          <div><div className="text-zinc-500">Failed Payments</div><div className="font-semibold">{kpis.failedPayments}</div></div>
          <div><div className="text-zinc-500">Successful Recoveries</div><div className="font-semibold">{kpis.successfulRecoveries}</div></div>
          <div><div className="text-zinc-500">Avg Recovery</div><div className="font-semibold">₹{(kpis.averageRecoveryAmount/100).toLocaleString("en-IN")}</div></div>
        </CardContent>
      </Card>
    </div>
  );
}
