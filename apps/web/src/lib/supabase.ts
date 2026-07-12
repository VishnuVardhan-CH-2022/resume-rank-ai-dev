/**
 * Browser Supabase client — RR-DEV-012 CP-04 / RR-DEP-011 §6.
 *
 * Uses ONLY public Vite env:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 *
 * Never import or reference SUPABASE_SERVICE_ROLE_KEY / GEMINI_* here.
 * AuthZ is enforced by RLS + JWT; the anon key is not a privilege bypass.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl?.trim() && supabaseAnonKey?.trim());
}

export function getSupabasePublicConfig(): {
  url: string | undefined;
  configured: boolean;
} {
  return {
    url: supabaseUrl?.trim() || undefined,
    configured: isSupabaseConfigured(),
  };
}

/**
 * Typed database generics can be added after Phase 3 migrations generate types.
 * Until then, the default client is untyped at the schema layer.
 */
function createBrowserClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in apps/web/.env (see root .env.example).",
    );
  }

  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

let client: SupabaseClient | null = null;

/** Lazy singleton — safe to import from modules without throwing when env is unset. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient();
  }
  return client;
}

/**
 * Eager export for call sites that already know env is present.
 * Prefer `getSupabase()` when env may be missing (local scaffold).
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const real = getSupabase();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
