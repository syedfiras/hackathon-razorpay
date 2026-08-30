import { NextRequest, NextResponse } from "next/server";
import { getPayments } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const method = searchParams.get("method") || undefined;
  const failureReason = searchParams.get("failureReason") || undefined;
  const take = parseInt(searchParams.get("take") || "50");
  const skip = parseInt(searchParams.get("skip") || "0");
  const payments = await getPayments({ take, skip, status, method, failureReason });
  return NextResponse.json(payments);
}
