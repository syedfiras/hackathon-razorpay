import { getRecoveryCases } from "@/lib/data";
import { RecoveryTable } from "@/components/recovery/RecoveryTable";
import { SimulateButton } from "@/components/demo/SimulateButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function RecoveryPage() {
  const cases = await getRecoveryCases({ take: 100 });
  const recovered = cases.filter((c:any)=>c.status==="recovered").length;
  const inProgress = cases.filter((c:any)=>c.status==="in_progress").length;
  const failed = cases.filter((c:any)=>c.status==="failed").length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recovery Cases</h1>
          <p className="text-sm text-zinc-500 mt-1">Autonomous recovery workflows — click a case for timeline & audit</p>
        </div>
        <SimulateButton />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-zinc-500">Recovered</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold text-emerald-600">{recovered}</div><CardDescription>{recovered} cases recovered</CardDescription></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-zinc-500">In Progress</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold text-amber-600">{inProgress}</div><CardDescription>Active workflows</CardDescription></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-zinc-500">Failed</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold text-red-600">{failed}</div><CardDescription>Needs manual review</CardDescription></CardContent></Card>
      </div>

      <RecoveryTable cases={cases as any[]} />
    </div>
  );
}
