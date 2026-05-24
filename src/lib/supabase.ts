/**
 * Supabase client — server-side ONLY (uses service role key).
 *
 * The wtm-content-studio talks to the same Supabase project as
 * wtm-social-automation. Tables live in `public.wtm_social_*`
 * (see ../wtm-social-automation/supabase/migrations/20260524_0002_*.sql).
 *
 * Auth is handled by NextAuth + Google OAuth — service role bypasses
 * Supabase RLS, so we must verify the user is in NEXT_AUTH_ALLOWLIST
 * before any handler reads/writes.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase env missing: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY must be set",
      );
    }
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}
