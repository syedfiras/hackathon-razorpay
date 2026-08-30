"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  RefreshCw,
  CreditCard,
  Brain,
  BarChart3,
  Settings,
  Shield,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/recovery", label: "Recovery Cases", icon: RefreshCw },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r bg-white">
      <div className="h-[64px] flex items-center gap-3 px-6 border-b">
        <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">RecoverAI</div>
          <div className="text-[10px] text-zinc-500 -mt-1 uppercase tracking-widest">Revenue Recovery</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
              <Shield className="h-3.5 w-3.5" />
              Test Mode
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              All transactions are simulated. No real money is moved.
            </p>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-zinc-100 border flex items-center justify-center text-xs font-semibold">
            RK
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Razorpay Store</div>
            <div className="text-xs text-zinc-500 truncate">merchant@demo.in</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-40">
      {navItems.slice(0, 5).map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-medium",
              active ? "text-zinc-900 bg-zinc-100" : "text-zinc-500"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
