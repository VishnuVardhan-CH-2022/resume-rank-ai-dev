/**
 * Supabase clients for Edge Functions — DEP §6.2.
 * Service role is Edge-only; never ship to Vite.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export function getEnv(name: string, fallback?: string): string {
  const value = Deno.env.get(name)?.trim() || fallback?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export function getServiceRoleClient(): SupabaseClient {
  const url = getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** User-scoped client using the caller's JWT (ownership reads via RLS). */
export function getUserClient(authHeader: string): SupabaseClient {
  const url = getEnv("SUPABASE_URL");
  const anon = getEnv("SUPABASE_ANON_KEY");
  return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSignedUrlExpiresIn(): number {
  const raw = Deno.env.get("SIGNED_URL_EXPIRES_IN")?.trim();
  const n = raw ? Number(raw) : 300;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 300;
}

export function getIdempotencyTtlHours(): number {
  const raw = Deno.env.get("IDEMPOTENCY_TTL_HOURS")?.trim();
  const n = raw ? Number(raw) : 24;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 24;
}
