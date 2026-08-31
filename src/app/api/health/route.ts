import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.DATABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabaseConfigured = !!supabaseUrl && !!supabaseKey && !supabaseUrl.includes("YOUR-PROJECT-REF") && !supabaseUrl.includes("placeholder");
  return NextResponse.json({
    status: "ok",
    service: "recoverai",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    env: {
      openrouter: !!process.env.OPENROUTER_API_KEY,
      razorpay: !!process.env.RAZORPAY_KEY_ID,
      database: supabaseConfigured,
      supabase: supabaseConfigured,
    }
  });
}
