import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export function RecentActions({ cases }: { cases: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Recovery Actions</CardTitle>
        <CardDescription>Latest autonomous recovery executions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {cases.slice(0,6).map((rc) => (
            <div key={rc.id} className="flex items-center justify-between p-3 rounded-xl border bg-zinc-50/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium">{rc.payment?.id?.slice(0,12) || rc.paymentId.slice(0,12)}</span>
                  <Badge variant={rc.status==="recovered"?"success": rc.status==="failed"?"destructive": "secondary"} className="text-[10px]">{rc.status}</Badge>
                  <span className="text-xs text-zinc-500">{rc.lastAction?.replace(/_/g," ")}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1 truncate">
                  {rc.payment?.customer?.name || "Customer"} • {rc.payment?.failureReason?.replace(/_/g," ")} • {formatCurrency(rc.payment?.amount || 0)}
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-sm font-semibold">{rc.recoveryProbability ? `${Math.round(rc.recoveryProbability*100)}%` : "—"}</div>
                <div className="text-xs text-zinc-500">{rc.amountRecovered ? formatCurrency(rc.amountRecovered) : "—"}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
