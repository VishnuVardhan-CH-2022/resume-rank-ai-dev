/**
 * Canonical body hashing for ADS §8.8 idempotency.
 * Pure helpers — safe to unit-test outside Deno.
 */

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Stable JSON for screen-job body comparison. */
export function canonicalizeScreenBody(input: {
  job_id: string;
  candidate_ids?: string[] | null;
}): string {
  const ids =
    input.candidate_ids && input.candidate_ids.length > 0
      ? [...input.candidate_ids].map((id) => id.toLowerCase()).sort()
      : null;
  return JSON.stringify({ job_id: input.job_id.toLowerCase(), candidate_ids: ids });
}

/** Stable JSON for retry-candidate body comparison. */
export function canonicalizeRetryBody(candidateId: string): string {
  return JSON.stringify({ candidate_id: candidateId.toLowerCase() });
}

export async function hashCanonicalBody(canonical: string): Promise<string> {
  return sha256Hex(canonical);
}
