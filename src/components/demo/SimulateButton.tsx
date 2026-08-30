"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Zap, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const amounts = [
  { label: "₹499", value: 49900 },
  { label: "₹1,999", value: 199900 },
  { label: "₹4,999", value: 499900 },
  { label: "₹12,999", value: 1299900 },
  { label: "₹24,999", value: 2499900 },
  { label: "₹49,999", value: 4999900 },
];

const failures = [
  { label: "Bank Timeout", value: "bank_timeout" },
  { label: "Insufficient Funds", value: "insufficient_funds" },
  { label: "Card Declined", value: "card_declined" },
  { label: "Expired Card", value: "expired_card" },
  { label: "UPI Failure", value: "upi_failure" },
];

const methods = [
  { label: "UPI", value: "upi" },
  { label: "Card", value: "card" },
  { label: "Netbanking", value: "netbanking" },
  { label: "Wallet", value: "wallet" },
];

export function SimulateButton() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(499900);
  const [failure, setFailure] = useState("bank_timeout");
  const [method, setMethod] = useState("upi");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/demo/simulate-failure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, failureReason: failure, paymentMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
      // refresh dashboard after 1.5s
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-zinc-900 hover:bg-zinc-800 gap-2">
        <Zap className="h-4 w-4" />
        Simulate Failed Payment
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Simulate Failed Payment
            </DialogTitle>
            <DialogDescription>Generate a realistic test payment and trigger autonomous recovery. No real money is moved.</DialogDescription>
          </DialogHeader>

          {!result ? (
            <div className="space-y-4">
              <div>
                <Label>Amount</Label>
                <Select value={String(amount)} onChange={(e) => setAmount(Number(e.target.value))}>
                  {amounts.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Failure Reason</Label>
                <Select value={failure} onChange={(e) => setFailure(e.target.value)}>
                  {failures.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {methods.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </Select>
              </div>

              <div className="rounded-lg border bg-amber-50 p-3 text-xs text-amber-800">
                <strong>TEST MODE:</strong> Transaction {formatCurrency(amount)} via {method.toUpperCase()} will fail as <em>{failure.replace(/_/g," ")}</em> and trigger RecoverAI.
              </div>

              {error && <div className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}

              <Button onClick={handleSimulate} disabled={loading} className="w-full">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Triggering Recovery..." : "Trigger Recovery"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${result.success ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-center gap-2 font-semibold text-sm">
                  {result.success ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                  {result.success ? "Payment Successfully Recovered!" : "Recovery In Progress"}
                </div>
                <div className="text-2xl font-bold mt-2">{formatCurrency(result.amountRecovered || amount)} {result.success ? "recovered" : "at risk"}</div>
                <div className="text-xs mt-1 opacity-80">AI decision: {result.executedAction?.replace(/_/g," ")} • Confidence {Math.round(result.confidence*100)}% • Prob {Math.round(result.recoveryProbability*100)}%</div>
                <div className="text-xs mt-2 font-mono">TXN {result.paymentId?.slice(0,16)} • CASE {result.recoveryCaseId?.slice(0,12)}</div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Timeline</div>
                <div className="space-y-2 text-xs">
                  {result.timeline?.map((t: any, i: number) => (
                    <div key={i} className="flex gap-3">
                      <div className={`h-2 w-2 rounded-full mt-1.5 ${t.status==="success"?"bg-emerald-500":"bg-zinc-300"}`} />
                      <div>
                        <div className="font-medium">{t.type.replace(/_/g," ")}</div>
                        <div className="text-zinc-500">{t.status} • {new Date(t.createdAt).toLocaleTimeString()}</div>
                      </div>
                      <Badge variant="outline" className="ml-auto h-5 text-[10px]">{t.status}</Badge>
                    </div>
                  )) || <div className="text-zinc-500">Timeline will appear after refresh</div>}
                </div>
              </div>

              <div className="rounded-lg bg-zinc-50 p-3 text-xs">
                <div className="font-semibold">Policy: {result.policyReason}</div>
                <div className="text-zinc-600 mt-1">{result.reason}</div>
              </div>

              <Button variant="outline" onClick={() => setOpen(false)} className="w-full">Close — Dashboard will refresh</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
