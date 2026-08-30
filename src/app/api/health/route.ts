import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "recoverai",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    env: {
      openrouter: !!process.env.OPENROUTER_API_KEY,
      razorpay: !!process.env.RAZORPAY_KEY_ID,
      database: !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("YOUR-PROJECT-REF"),
    }
  });
}
