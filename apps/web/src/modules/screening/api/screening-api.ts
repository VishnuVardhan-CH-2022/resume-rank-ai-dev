/**
 * SPA screening command client — ADS §8 / Phase 8 Edge invoke helpers.
 * Full Start Screening + poll UX is CP-23; this module is the HTTPS client.
 */
import { getSupabase } from "@/lib/supabase";
import {
  createErrorObject,
  normalizeUnknownError,
  type ErrorObject,
} from "@/lib/errors";

export type ScreenAcceptedPayload = {
  accepted: true;
  job_id: string;
  accepted_candidate_ids: string[];
  status: "queued";
  message: string;
};

export type ResumeUrlPayload = {
  candidate_id: string;
  signed_url: string;
  expires_in: number;
  mime_type: string;
  original_filename: string;
};

export type ScreeningResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: ErrorObject; status: number };

function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

async function parseFunctionError(
  error: unknown,
  response: Response | null,
): Promise<{ error: ErrorObject; status: number }> {
  if (response) {
    try {
      const body = await response.json();
      if (body && typeof body === "object" && "error" in body) {
        return {
          error: normalizeUnknownError(body),
          status: response.status,
        };
      }
    } catch {
      // fall through
    }
    return {
      error: createErrorObject({
        code: response.status === 401 ? "EH-AUTH" : "EH-SYS",
        message: `Screening request failed (${response.status}).`,
      }),
      status: response.status,
    };
  }

  return {
    error: normalizeUnknownError(error),
    status: 500,
  };
}

/** POST screen-job — requires Idempotency-Key (generated if omitted). */
export async function screenJob(
  jobId: string,
  options?: { candidateIds?: string[]; idempotencyKey?: string },
): Promise<ScreeningResult<ScreenAcceptedPayload>> {
  const key = options?.idempotencyKey ?? newIdempotencyKey();
  const body: { job_id: string; candidate_ids?: string[] } = {
    job_id: jobId,
  };
  if (options?.candidateIds?.length) {
    body.candidate_ids = options.candidateIds;
  }

  const { data, error } = await getSupabase().functions.invoke("screen-job", {
    body,
    headers: { "Idempotency-Key": key },
  });

  if (error) {
    const ctx = (
      error as { context?: Response }
    ).context ?? null;
    const parsed = await parseFunctionError(error, ctx);
    return { ok: false, ...parsed };
  }

  if (
    !data ||
    typeof data !== "object" ||
    (data as ScreenAcceptedPayload).accepted !== true
  ) {
    return {
      ok: false,
      status: 500,
      error: createErrorObject({
        code: "EH-SYS",
        message: "Unexpected screen-job response.",
      }),
    };
  }

  return {
    ok: true,
    status: 202,
    data: data as ScreenAcceptedPayload,
  };
}

/** POST retry-candidate — failed_ai only. */
export async function retryCandidate(
  candidateId: string,
  options?: { idempotencyKey?: string },
): Promise<ScreeningResult<ScreenAcceptedPayload>> {
  const key = options?.idempotencyKey ?? newIdempotencyKey();
  const { data, error } = await getSupabase().functions.invoke(
    "retry-candidate",
    {
      body: { candidate_id: candidateId },
      headers: { "Idempotency-Key": key },
    },
  );

  if (error) {
    const ctx = (error as { context?: Response }).context ?? null;
    const parsed = await parseFunctionError(error, ctx);
    return { ok: false, ...parsed };
  }

  if (
    !data ||
    typeof data !== "object" ||
    (data as ScreenAcceptedPayload).accepted !== true
  ) {
    return {
      ok: false,
      status: 500,
      error: createErrorObject({
        code: "EH-SYS",
        message: "Unexpected retry-candidate response.",
      }),
    };
  }

  return {
    ok: true,
    status: 202,
    data: data as ScreenAcceptedPayload,
  };
}

/** GET resume-url — owner-only signed URL (ADS §6.5). */
export async function fetchResumeUrl(
  candidateId: string,
): Promise<ScreeningResult<ResumeUrlPayload>> {
  const session = await getSupabase().auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: createErrorObject({ code: "EH-AUTH" }),
    };
  }

  const base = import.meta.env.VITE_SUPABASE_URL as string;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const url = `${base.replace(/\/$/, "")}/functions/v1/resume-url?candidate_id=${encodeURIComponent(candidateId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: normalizeUnknownError(
        body ?? { error: { code: "EH-SYS", message: "resume-url failed" } },
      ),
    };
  }

  return {
    ok: true,
    status: 200,
    data: body as ResumeUrlPayload,
  };
}
