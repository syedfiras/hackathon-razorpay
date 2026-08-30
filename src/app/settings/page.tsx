import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1000px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Environment and integration status — all test mode, no real money.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Environment</CardTitle><CardDescription>Configurable via environment variables</CardDescription></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500">DATABASE_URL</div>
              <div className="font-mono text-xs mt-1">{process.env.DATABASE_URL ? "● Configured (Supabase)" : "○ Not set — using mock fallback"}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500">OPENROUTER_MODEL</div>
              <div className="font-mono text-xs mt-1">{process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free"}</div>
              <Badge variant={process.env.OPENROUTER_API_KEY ? "success" : "secondary"} className="mt-2 text-xs">{process.env.OPENROUTER_API_KEY ? "API key set" : "No key — deterministic fallback active"}</Badge>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500">RAZORPAY_KEY_ID</div>
              <div className="font-mono text-xs mt-1">{process.env.RAZORPAY_KEY_ID || "rzp_test_demo (simulated)"}</div>
              <Badge variant="secondary" className="mt-2 text-xs">Test Mode Only</Badge>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500">NEXT_PUBLIC_APP_URL</div>
              <div className="font-mono text-xs mt-1">{process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}</div>
            </div>
          </div>
          <div className="rounded-lg bg-zinc-50 border p-3 text-xs leading-relaxed">
            <strong>₹0 Constraint:</strong> Uses OpenRouter free models + Razorpay test mode + simulated notifications. No paid APIs required. AI provider is model-agnostic via <code className="font-mono bg-white px-1 rounded border">OPENROUTER_MODEL</code>.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Merchant</CardTitle><CardDescription>Single demo merchant for hackathon</CardDescription></CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-zinc-900 text-white flex items-center justify-center font-semibold">RS</div>
          <div>
            <div className="font-medium">Razorpay Demo Store</div>
            <div className="text-sm text-zinc-500">merchant@recoverai.demo • Test Mode</div>
          </div>
          <Badge className="ml-auto" variant="secondary">Demo Data</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Architecture</CardTitle><CardDescription>Detect → Diagnose → Decide → Act → Measure</CardDescription></CardHeader>
        <CardContent className="text-sm leading-relaxed space-y-2">
          <div className="font-mono text-xs bg-zinc-950 text-zinc-100 p-3 rounded-lg overflow-auto">
            Payment → Failure Detector → Context Builder → Scoring → AI Agent → Policy Engine → Recovery Tool → Outcome → Analytics
          </div>
          <p className="text-zinc-600">Policy engine validates every AI decision before execution. All decisions audited with model, context, reasoning, and outcome.</p>
        </CardContent>
      </Card>
    </div>
  );
}
