"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export function TransactionsTable({ payments }: { payments: any[] }) {
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [failure, setFailure] = useState("all");
  const [search, setSearch] = useState("");

  let filtered = payments;
  if (status!=="all") filtered = filtered.filter(p=>p.status===status);
  if (method!=="all") filtered = filtered.filter(p=>p.paymentMethod===method);
  if (failure!=="all") filtered = filtered.filter(p=> (p.failureReason||"none")===failure);
  if (search) filtered = filtered.filter(p=> p.id.toLowerCase().includes(search.toLowerCase()) || p.customer?.name?.toLowerCase().includes(search.toLowerCase()) || p.razorpayPaymentId?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Input placeholder="Search txn / customer / pay_..." value={search} onChange={e=>setSearch(e.target.value)} />
        <Select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="captured">Captured</option>
          <option value="failed">Failed</option>
          <option value="recovered">Recovered</option>
          <option value="authorized">Authorized</option>
        </Select>
        <Select value={method} onChange={e=>setMethod(e.target.value)}>
          <option value="all">All Methods</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="netbanking">Netbanking</option>
          <option value="wallet">Wallet</option>
        </Select>
        <Select value={failure} onChange={e=>setFailure(e.target.value)}>
          <option value="all">All Reasons</option>
          <option value="bank_timeout">Bank Timeout</option>
          <option value="insufficient_funds">Insufficient Funds</option>
          <option value="card_declined">Card Declined</option>
          <option value="expired_card">Expired Card</option>
          <option value="upi_failure">UPI Failure</option>
          <option value="none">No Failure</option>
        </Select>
      </div>

      <div className="text-xs text-zinc-500">{filtered.length} of {payments.length} payments</div>

      <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Txn ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Failure Reason</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0,60).map(p=>(
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.razorpayPaymentId?.slice(0,14) || p.id.slice(0,14)}</TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{p.customer?.name}</div>
                  <div className="text-xs text-zinc-500">{p.customer?.email?.slice(0,22)}</div>
                </TableCell>
                <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-xs">{p.paymentMethod}</Badge></TableCell>
                <TableCell><Badge variant={p.status==="captured"?"success": p.status==="recovered"?"success": p.status==="failed"?"destructive":"secondary"} className="capitalize text-xs">{p.status}</Badge></TableCell>
                <TableCell className="text-xs capitalize">{p.failureReason ? p.failureReason.replace(/_/g," ") : <span className="text-zinc-400">—</span>}</TableCell>
                <TableCell className="text-xs text-zinc-600">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {filtered.length===0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-zinc-500">No transactions match filters</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
