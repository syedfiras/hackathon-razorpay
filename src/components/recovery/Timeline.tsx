import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, Brain, Shield, Search, Calculator, Send, Link2, RefreshCw } from "lucide-react";

const iconMap: Record<string, any> = {
  diagnose: Search,
  get_history: Search,
  calculate_probability: Calculator,
  ai_decision: Brain,
  policy_validation: Shield,
  retry_payment: RefreshCw,
  create_payment_link: Link2,
  send_message: Send,
  send_reminder: Send,
  escalate: AlertCircle,
};

export function Timeline({ actions }: { actions: { type: string; status: string; createdAt: string; isSimulated?: boolean }[] }) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-zinc-200" />
      <div className="space-y-4">
        {actions.map((a, i) => {
          const Icon = iconMap[a.type] || Clock;
          const isSuccess = a.status === "success";
          const isFailed = a.status === "failed";
          return (
            <div key={i} className="relative flex gap-4">
              <div className={`h-7 w-7 rounded-full border-2 bg-white flex items-center justify-center shrink-0 z-10 ${isSuccess ? "border-emerald-500 text-emerald-600" : isFailed ? "border-red-400 text-red-600" : "border-zinc-300 text-zinc-400"}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0 pb-2">
                <div className="text-sm font-medium capitalize flex items-center gap-2">
                  {a.type.replace(/_/g, " ")}
                  {a.isSimulated && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 border text-zinc-500">SIMULATED</span>}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {new Date(a.createdAt).toLocaleTimeString()} • {a.status}
                </div>
              </div>
              <Badge variant={isSuccess ? "success" : isFailed ? "destructive" : "secondary"} className="h-5 text-xs shrink-0 capitalize">{a.status}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
