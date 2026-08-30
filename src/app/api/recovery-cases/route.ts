import { NextRequest, NextResponse } from "next/server";
import { getRecoveryCases } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const take = parseInt(searchParams.get("take") || "50");
  const cases = await getRecoveryCases({ take, status });
  return NextResponse.json(cases);
}
