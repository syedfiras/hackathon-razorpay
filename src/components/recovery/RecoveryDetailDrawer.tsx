"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { X, Brain, Shield, Clock, CheckCircle, AlertCircle, Zap } from "lucide-react";

export function RecoveryDetailDrawer({ recoveryCase, open, onClose }: { recoveryCase: any; open: boolean; onClose: () => void }) {
  if (!open) return null;
  const rc = recoveryCase;
  const payment = rc.payment;
  const decision = rc.decisions?.[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[640px] bg-white h-full overflow-auto border-l shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Recovery Case
              <Badge variant="outline" className="font-mono text-xs">{rc.id.slice(0,12)}</Badge>
            </div>
            <div className="text-xs text-zinc-500 mt-1">Transaction {payment?.id?.slice(0,16) || rc.paymentId.slice(0,16)} • {new Date(rc.createdAt).toLocaleString()}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-4">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Amount</div>
              <div className="text-xl font-semibold mt-1">{formatCurrency(payment?.amount || 0)}</div>
              <div className="text-xs text-zinc-500 mt-1 capitalize">{payment?.paymentMethod} • {payment?.failureReason?.replace(/_/g," ")}</div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Customer</div>
              <div className="text-sm font-medium mt-1">{payment?.customer?.name || "Unknown"}</div>
              <div className="text-xs text-zinc-500 mt-1">{payment?.customer?.email}</div>
              <div className="text-xs mt-1"><Badge variant="secondary" className="text-xs">{payment?.customer?.segment}</Badge> LTV {formatCurrency(payment?.customer?.lifetimeValue || 0)}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border p-3 text-center">
              <div className="text-xs text-zinc-500">Probability</div>
              <div className="text-lg font-semibold mt-1">{rc.recoveryProbability ? `${Math.round(rc.recoveryProbability*100)}%` : "—"}</div>
              <div className="text-xs mt-1"><Badge variant={rc.recoveryProbability>=0.7?"success": rc.recoveryProbability>=0.4?"warning":"destructive"}>{rc.recoveryProbability>=0.7?"High": rc.recoveryProbability>=0.4?"Medium":"Low"}</Badge></div>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <div className="text-xs text-zinc-500">Status</div>
              <div className="mt-2"><Badge variant={rc.status==="recovered"?"success": rc.status==="failed"?"destructive":"secondary"} className="capitalize">{rc.status.replace(/_/g," ")}</Badge></div>
              <div className="text-xs text-zinc-500 mt-2">{rc.lastAction?.replace(/_/g," ")}</div>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <div className="text-xs text-zinc-500">Recovered</div>
              <div className={`text-lg font-semibold mt-1 ${rc.amountRecovered?"text-emerald-600":"text-zinc-400"}`}>{rc.amountRecovered ? formatCurrency(rc.amountRecovered) : "—"}</div>
              <div className="text-xs text-zinc-500 mt-1">{rc.attemptCount}/{3} attempts</div>
            </div>
          </div>

          {/* AI Recommendation */}
          {decision && (
            <div className="rounded-xl border bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><Brain className="h-4 w-4" /> AI Recommendation</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-zinc-500">Decision:</span> <Badge variant="outline" className="ml-1 capitalize">{decision.decision.replace(/_/g," ")}</Badge></div>
                <div><span className="text-zinc-500">Confidence:</span> <span className="font-medium ml-1">{Math.round(decision.confidence*100)}%</span></div>
                <div><span className="text-zinc-500">Fallback:</span> <span className="capitalize ml-1">{decision.fallback_action || decision.fallbackAction || "—"}</span></div>
                <div><span className="text-zinc-500">Model:</span> <span className="font-mono text-xs ml-1">{decision.model}</span></div>
              </div>
              <div className="mt-3 text-sm bg-white rounded-lg border p-3">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Reasoning</div>
                <p className="mt-1 text-zinc-700">{decision.reasoning || decision.reason}</p>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Shield className="h-3.5 w-3.5 text-zinc-500" />
                Policy: <Badge variant={decision.policyVerdict==="allowed"?"success":"warning"}>{decision.policyVerdict}</Badge>
                <span className="text-zinc-500">{decision.policyReason || "Validation passed"}</span>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <div className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Recovery Timeline</div>
            <div className="mt-3 relative">
              <div className="absolute left-3 top-2 bottom-2 w-px bg-zinc-200" />
              <div className="space-y-4">
                {(rc.actions || []).map((a:any, i:number)=>(
                  <div key={i} className="relative flex gap-4">
                    <div className={`h-6 w-6 rounded-full border-2 bg-white flex items-center justify-center shrink-0 z-10 ${a.status==="success"?"border-emerald-500 text-emerald-600": a.status==="failed"?"border-red-400 text-red-600":"border-zinc-300 text-zinc-400"}`}>
                      {a.status==="success"? <CheckCircle className="h-3 w-3" /> : a.status==="failed"? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="text-sm font-medium capitalize">{a.type.replace(/_/g," ")}</div>
                      <div className="text-xs text-zinc-500">{a.status} • {new Date(a.createdAt).toLocaleTimeString()} • {a.isSimulated?"SIMULATED":""}</div>
                    </div>
                    <Badge variant={a.status==="success"?"success": a.status==="failed"?"destructive":"secondary"} className="h-5 text-xs shrink-0">{a.status}</Badge>
                  </div>
                ))}
                {(!rc.actions || rc.actions.length===0) && <div className="text-sm text-zinc-500">No timeline yet</div>}
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          {decision && (
            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold">Audit Trail</div>
              <div className="mt-2 text-xs font-mono bg-zinc-950 text-zinc-100 rounded-lg p-3 overflow-auto max-h-48">
                <pre>{JSON.stringify(decision, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-4 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
          <Button className="flex-1" onClick={()=> alert("Escalate / retry would trigger engine in production")}>Escalate</Button>
        </div>
      </div>
    </div>
  );
}
