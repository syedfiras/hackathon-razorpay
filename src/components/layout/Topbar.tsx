"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Bell } from "lucide-react";

export function Topbar() {
  return (
    <header className="h-[64px] border-b bg-white flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3 md:hidden">
        <div className="h-7 w-7 rounded-lg bg-zinc-900 flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-semibold text-sm">RecoverAI</span>
        <Badge variant="secondary" className="text-[10px] h-5">TEST</Badge>
      </div>
      <div className="hidden md:flex items-center gap-2">
        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
          ● Demo data — simulated / test mode
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="hidden md:block text-right">
          <div className="text-sm font-medium">Razorpay Demo</div>
          <div className="text-xs text-zinc-500">Last sync: just now</div>
        </div>
      </div>
    </header>
  );
}
