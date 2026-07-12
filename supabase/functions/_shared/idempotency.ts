/**
 * Idempotency store — ADS §8.8 / DEP IDEMPOTENCY_TTL_HOURS.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createErrorObject, type ErrorObject } from "./errors.ts";
import { getIdempotencyTtlHours } from "./supabase.ts";

export type IdempotencyRoute = "screen" | "retry";

export type IdempotencyLookup =
  | { kind: "miss" }
  | { kind: "replay"; status: number; body: unknown }
  | { kind: "conflict"; error: ErrorObject };

type IdempotencyRow = {
  request_body_hash: string;
  response_status: number;
  response_body: unknown;
  created_at: string;
};

export async function lookupIdempotency(
  admin: SupabaseClient,
  userId: string,
  key: string,
  bodyHash: string,
): Promise<IdempotencyLookup> {
  const { data, error } = await admin
    .from("idempotency_keys")
    .select("request_body_hash, response_status, response_body, created_at")
    .eq("user_id", userId)
    .eq("idempotency_key", key)
    .maybeSingle();

  if (error) {
    return {
      kind: "conflict",
      error: createErrorObject({
        code: "EH-SYS",
        message: "Idempotency lookup failed.",
        details: { vendor: error.message },
        retryable: true,
      }),
    };
  }

  if (!data) return { kind: "miss" };

  const row = data as IdempotencyRow;
  const ttlHours = getIdempotencyTtlHours();
  const created = Date.parse(row.created_at);
  const ageMs = Number.isFinite(created) ? Date.now() - created : 0;
  if (ageMs > ttlHours * 3600_000) {
    // Expired — treat as miss; overwrite on store.
    await admin
      .from("idempotency_keys")
      .delete()
      .eq("user_id", userId)
      .eq("idempotency_key", key);
    return { kind: "miss" };
  }

  if (row.request_body_hash !== bodyHash) {
    return {
      kind: "conflict",
      error: createErrorObject({
        code: "EH-VAL",
        message: "Idempotency-Key was reused with a different request body.",
        details: { reason: "idempotency_body_mismatch", http_hint: 409 },
      }),
    };
  }

  return {
    kind: "replay",
    status: row.response_status,
    body: row.response_body,
  };
}

export async function storeIdempotency(
  admin: SupabaseClient,
  input: {
    userId: string;
    key: string;
    route: IdempotencyRoute;
    bodyHash: string;
    responseStatus: number;
    responseBody: unknown;
  },
): Promise<void> {
  const { error } = await admin.from("idempotency_keys").upsert(
    {
      user_id: input.userId,
      idempotency_key: input.key,
      route: input.route,
      request_body_hash: input.bodyHash,
      response_status: input.responseStatus,
      response_body: input.responseBody,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,idempotency_key" },
  );

  if (error) {
    // Best-effort: command already succeeded; log without PII.
    console.error("idempotency_store_failed", {
      route: input.route,
      code: error.code,
    });
  }
}
