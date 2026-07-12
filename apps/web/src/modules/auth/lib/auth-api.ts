/**
 * Auth API wrappers — ADS §4 via Supabase Auth SDK (RR-DEV-012 CP-09).
 */
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  createErrorObject,
  fromAuthError,
  type ErrorObject,
} from "@/lib/errors";

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorObject };

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult<{ session: Session; user: User }>> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-SYS",
        message:
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      }),
    };
  }

  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.session || !data.user) {
    return { ok: false, error: fromAuthError(error ?? { status: 401 }) };
  }

  return { ok: true, data: { session: data.session, user: data.user } };
}

export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<
  AuthResult<{ session: Session | null; user: User | null; needsConfirm: boolean }>
> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: createErrorObject({
        code: "EH-SYS",
        message:
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      }),
    };
  }

  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    return { ok: false, error: fromAuthError(error) };
  }

  // Email confirmation off → session present; on → holding message (UXD §6.2)
  const needsConfirm = !data.session && !!data.user;
  return {
    ok: true,
    data: {
      session: data.session,
      user: data.user,
      needsConfirm,
    },
  };
}

export async function signOut(): Promise<AuthResult<null>> {
  if (!isSupabaseConfigured()) {
    return { ok: true, data: null };
  }

  const { error } = await getSupabase().auth.signOut();
  if (error) {
    return { ok: false, error: fromAuthError(error) };
  }
  return { ok: true, data: null };
}

/**
 * Single refresh attempt before treating as 401 (UXD §14.6 / CP-10).
 * Avoids refresh loops — callers must not retry endlessly.
 */
export async function refreshSessionOnce(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { data, error } = await getSupabase().auth.refreshSession();
  return !error && Boolean(data.session);
}
