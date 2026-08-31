import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

// Service role client — server-side only, bypasses RLS
// Falls back to anon key if service key not set (for dev without RLS)
function getSupabaseAdmin() {
  const key = supabaseServiceKey || supabaseAnonKey;
  if (!supabaseUrl || !key) {
    // Return a dummy client that will fail gracefully; callers check isSupabaseConfigured()
    return createClient("https://placeholder.supabase.co", "placeholder-key");
  }
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Anon client — safe for client-side or RLS-enabled reads
function getSupabaseAnon() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return createClient("https://placeholder.supabase.co", "placeholder-key");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Singleton pattern similar to prisma.ts to avoid multiple clients in dev HMR
const globalForSupabase = globalThis as unknown as {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin> | undefined;
  supabaseAnonClient: ReturnType<typeof getSupabaseAnon> | undefined;
};

export const supabase =
  globalForSupabase.supabaseAdmin ?? getSupabaseAdmin();

export const supabaseAnon =
  globalForSupabase.supabaseAnonClient ?? getSupabaseAnon();

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabaseAdmin = supabase;
  globalForSupabase.supabaseAnonClient = supabaseAnon;
}

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!(supabaseServiceKey || supabaseAnonKey) && !supabaseUrl.includes("YOUR-PROJECT-REF") && supabaseUrl.includes("supabase.co");
};

export default supabase;
