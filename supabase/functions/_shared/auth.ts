/**
 * JWT extraction — ADS §4 / DEP §9.3.
 */
import type { User } from "npm:@supabase/supabase-js@2";
import { getUserClient } from "./supabase.ts";
import { createErrorObject, type ErrorObject } from "./errors.ts";

export type AuthResult =
  | { ok: true; user: User; authHeader: string }
  | { ok: false; status: number; error: ErrorObject };

export async function requireUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization")?.trim() ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      status: 401,
      error: createErrorObject({
        code: "EH-AUTH",
        message: "Authentication required or session expired.",
      }),
    };
  }

  const client = getUserClient(authHeader);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return {
      ok: false,
      status: 401,
      error: createErrorObject({
        code: "EH-AUTH",
        message: "Authentication required or session expired.",
      }),
    };
  }

  return { ok: true, user: data.user, authHeader };
}

export function requireIdempotencyKey(
  req: Request,
): { ok: true; key: string } | { ok: false; status: number; error: ErrorObject } {
  const key = req.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!key) {
    return {
      ok: false,
      status: 400,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Idempotency-Key header is required.",
        details: { reason: "missing_idempotency_key" },
      }),
    };
  }
  if (key.length > 256) {
    return {
      ok: false,
      status: 400,
      error: createErrorObject({
        code: "EH-VAL",
        message: "Idempotency-Key is too long.",
        details: { reason: "idempotency_key_too_long" },
      }),
    };
  }
  return { ok: true, key };
}
