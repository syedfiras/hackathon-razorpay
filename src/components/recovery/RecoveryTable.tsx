"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { RecoveryDetailDrawer } from "./RecoveryDetailDrawer";

export function RecoveryTable({ cases }: { cases: any[] }) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);

  let filtered = cases;
  if(filterStatus!=="all") filtered = filtered.filter(c=>c.status===filterStatus);
  if(search) filtered = filtered.filter(c=> 
    c.paymentId.toLowerCase().includes(search.toLowerCase()) ||
    c.payment?.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.payment?.failureReason?.includes(search.toLowerCase())
  );

  const getStatusVariant = (s:string) => {
    if(s==="recovered") return "success";
    if(s==="failed") return "destructive";
    if(s==="in_progress") return "warning";
    if(s==="escalated") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Search txn, customer, reason..." value={search} onChange={e=>setSearch(e.target.value)} className="max-w-sm" />
        <Select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="w-[160px]">
          <option value="all">All Status</option>
          <option value="recovered">Recovered</option>
          <option value="in_progress">In Progress</option>
          <option value="open">Open</option>
          <option value="failed">Failed</option>
          <option value="escalated">Escalated</option>
        </Select>
        <div className="ml-auto text-xs text-zinc-500 pt-2">{filtered.length} cases</div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Failure Reason</TableHead>
              <TableHead>Probability</TableHead>
              <TableHead>AI Recommendation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recovered</TableHead>
              <TableHead>Last Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0,50).map((rc)=> (
              <TableRow key={rc.id} className="cursor-pointer hover:bg-zinc-50" onClick={()=>setSelected(rc)}>
                <TableCell className="font-mono text-xs">{rc.paymentId.slice(0,14)}...</TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{rc.payment?.customer?.name || "—"}</div>
                  <div className="text-xs text-zinc-500">{rc.payment?.customer?.email?.slice(0,20) || ""}</div>
                </TableCell>
                <TableCell className="font-medium">{formatCurrency(rc.payment?.amount || 0)}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs capitalize">{(rc.payment?.failureReason || "unknown").replace(/_/g," ")}</Badge></TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${ (rc.recoveryProbability||0) >=0.8 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : (rc.recoveryProbability||0)>=0.45 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200" }`}>
                    {rc.recoveryProbability ? `${Math.round(rc.recoveryProbability*100)}%` : "—"}
                  </span>
                </TableCell>
                <TableCell className="text-xs capitalize">{rc.decisions?.[0]?.decision?.replace(/_/g," ") || rc.lastAction?.replace(/_/g," ") || "—"}</TableCell>
                <TableCell><Badge variant={getStatusVariant(rc.status) as any}>{rc.status.replace(/_/g," ")}</Badge></TableCell>
                <TableCell className={rc.amountRecovered ? "text-emerald-600 font-medium" : "text-zinc-400"}>{rc.amountRecovered ? formatCurrency(rc.amountRecovered) : "—"}</TableCell>
                <TableCell className="text-xs capitalize">{(rc.lastAction || "—").replace(/_/g," ")}</TableCell>
              </TableRow>
            ))}
            {filtered.length===0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-zinc-500">No recovery cases found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {selected && <RecoveryDetailDrawer recoveryCase={selected} open={!!selected} onClose={()=>setSelected(null)} />}
    </div>
  );
}
