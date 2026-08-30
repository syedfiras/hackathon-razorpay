import { NextResponse } from "next/server";
import { getKPIs } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const kpis = await getKPIs();
  return NextResponse.json(kpis);
}
