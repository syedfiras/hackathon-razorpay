import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RecoverAI — AI Revenue Recovery",
  description:
    "Autonomous AI revenue recovery platform — Detect, Diagnose, Decide, Act, Measure. Built for Razorpay AI Buildathon.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-zinc-50 text-zinc-900">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
