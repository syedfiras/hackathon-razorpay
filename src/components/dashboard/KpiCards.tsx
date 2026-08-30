import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyCompact } from "@/lib/utils";
import { TrendingUp, AlertTriangle, CheckCircle, XCircle, Banknote, Percent } from "lucide-react";

interface KPIs {
  revenueAtRisk: number;
  revenueRecovered: number;
  recoveryRate: number;
  failedPayments: number;
  successfulRecoveries: number;
  averageRecoveryAmount: number;
  totalPayments: number;
}

export function KpiCards({ kpis }: { kpis: KPIs }) {
  const cards = [
    {
      title: "Revenue At Risk",
      value: formatCurrencyCompact(kpis.revenueAtRisk),
      sub: `${kpis.failedPayments} failed payments`,
      icon: AlertTriangle,
      trend: "At risk",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Revenue Recovered",
      value: formatCurrencyCompact(kpis.revenueRecovered),
      sub: `${kpis.successfulRecoveries} successful recoveries`,
      icon: CheckCircle,
      trend: "+ recovered",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Recovery Rate",
      value: `${kpis.recoveryRate}%`,
      sub: "of at-risk revenue",
      icon: Percent,
      trend: kpis.recoveryRate >= 60 ? "Strong" : "Growing",
      color: "text-sky-600",
      bg: "bg-sky-50",
    },
    {
      title: "Failed Payments",
      value: String(kpis.failedPayments),
      sub: `of ${kpis.totalPayments} total`,
      icon: XCircle,
      trend: "Need attention",
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Successful Recoveries",
      value: String(kpis.successfulRecoveries),
      sub: "autonomous recoveries",
      icon: TrendingUp,
      trend: "AI-driven",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Avg Recovery Amount",
      value: formatCurrencyCompact(kpis.averageRecoveryAmount),
      sub: "per recovery",
      icon: Banknote,
      trend: "Per case",
      color: "text-zinc-700",
      bg: "bg-zinc-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.title} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                {c.title}
              </CardTitle>
              <div className={`h-8 w-8 rounded-lg ${c.bg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{c.value}</div>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                {c.sub} <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${c.bg} ${c.color}`}>{c.trend}</span>
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
