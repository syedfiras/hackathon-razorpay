// LEGACY SHIM — Prisma removed, now using Supabase
// This file is kept for backward compatibility only.
// Please import from "@/lib/db/supabase" instead.
// It re-exports supabase as `prisma` to avoid breaking any lingering imports during migration.

import { supabase as supabaseClient } from "./supabase";

// Shim: any code still importing `prisma` will get supabase client (will fail gracefully if used as Prisma)
// Prefer migrating to supabase client directly.
export const prisma: any = supabaseClient;
export default prisma;
