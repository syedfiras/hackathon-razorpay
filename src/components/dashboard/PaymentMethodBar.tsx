"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function PaymentMethodBar({ data }: { data: { method: string; total: number; recovered: number; rate: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recovery by Payment Method</CardTitle>
        <CardDescription>Performance across UPI, Card, Netbanking, Wallet</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="method" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill="#e4e4e7" name="Total Failed" radius={[6,6,0,0]} />
            <Bar dataKey="recovered" fill="#059669" name="Recovered" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
