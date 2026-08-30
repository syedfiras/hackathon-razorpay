"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6 max-w-[800px] mx-auto">
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" /> Dashboard failed to load
          </CardTitle>
          <CardDescription className="text-red-600/80">{error.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-600">
            This may happen when the database is not reachable. The app automatically falls back to mock data — try refreshing.
            If <code className="bg-zinc-100 px-1 rounded">DATABASE_URL</code> is not set, mock data is used.
          </p>
          <Button onClick={reset} variant="outline">Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
