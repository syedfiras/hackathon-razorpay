"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function RevenueTrend({ data }: { data: { date: string; recovered: number; atRisk: number }[] }) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Recovery Trend</CardTitle>
        <CardDescription>Revenue recovered vs at-risk over last 14 days (₹ hundreds)</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="recovered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="atRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7" }} />
            <Area type="monotone" dataKey="atRisk" stroke="#f59e0b" fill="url(#atRisk)" strokeWidth={2} name="At Risk (₹100s)" />
            <Area type="monotone" dataKey="recovered" stroke="#059669" fill="url(#recovered)" strokeWidth={2} name="Recovered (₹100s)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
