"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#06b6d4"];

export function FailureDonut({ data }: { data: { name: string; value: number }[] }) {
  const formatted = data.map(d => ({ ...d, name: d.name.replace(/_/g, " ") }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Failure Reasons</CardTitle>
        <CardDescription>Distribution of failure types</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={formatted} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
              {formatted.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
