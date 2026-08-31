# Supabase Setup

## Quick Start
1. Create project at https://supabase.com/dashboard
2. Go to **Settings → API** → copy `Project URL`, `anon public` key, `service_role` key
3. Paste into `.env`:
   ```
   NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT-REF.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon key]"
   SUPABASE_SERVICE_ROLE_KEY="[service_role key]"
   ```
4. Run migration: **SQL Editor → New Query → paste `supabase/migrations/001_initial.sql` → Run**
5. Seed: `npm run db:seed`

## Migrations
- `001_initial.sql` creates all 10 tables, indexes, triggers, disables RLS for hackathon.
- If you enable RLS later, add policies that allow `service_role` full access.

## Verification
- Check tables in **Table Editor**
- Test `SELECT count(*) FROM merchants;` after seed (should be 1)
