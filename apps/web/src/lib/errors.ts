/**
 * ErrorObject normalization — RR-API-006 §10.1–10.2 / RR-DEV-012 CP-05.
 *
 * SPA must not surface raw vendor payloads as the primary UX contract.
 */

export type ErrorCode =
  | "EH-AUTH"
  | "EH-VAL"
  | "EH-FORB"
  | "EH-STORE"
  | "EH-PARSE"
  | "EH-AI"
  | "EH-SYS";

export type ErrorObjectBody = {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown> | null;
  failure_code?: string | null;
  request_id?: string | null;
  retryable?: boolean;
};

export type ErrorObject = {
  error: ErrorObjectBody;
};

const SAFE_MESSAGE_MAX = 280;

function sanitizeMessage(message: string, fallback: string): string {
  const trimmed = message.replace(/\s+/g, " ").trim();
  if (!trimmed) return fallback;
  // Strip obvious stack / secret leakage patterns from user-facing text.
  const cleaned = trimmed
    .replace(/at\s+\S+\s+\([^)]+\)/g, "")
    .replace(/service[_-]?role/gi, "[redacted]")
    .replace(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[redacted]")
    .trim();
  const out = cleaned || fallback;
  return out.length > SAFE_MESSAGE_MAX
    ? `${out.slice(0, SAFE_MESSAGE_MAX - 1)}…`
    : out;
}

export function createErrorObject(
  partial: Omit<ErrorObjectBody, "message"> & { message?: string },
): ErrorObject {
  const fallback = defaultMessage(partial.code);
  return {
    error: {
      code: partial.code,
      message: sanitizeMessage(partial.message ?? fallback, fallback),
      details: partial.details ?? null,
      failure_code: partial.failure_code ?? null,
      request_id: partial.request_id ?? null,
      retryable: partial.retryable ?? isRetryableDefault(partial.code),
    },
  };
}

function defaultMessage(code: ErrorCode): string {
  switch (code) {
    case "EH-AUTH":
      return "Authentication required or session expired.";
    case "EH-VAL":
      return "The request failed validation.";
    case "EH-FORB":
      return "You do not have access to this resource.";
    case "EH-STORE":
      return "Storage operation failed. Please try again.";
    case "EH-PARSE":
      return "Resume parsing failed.";
    case "EH-AI":
      return "AI screening failed for this candidate.";
    case "EH-SYS":
      return "A system error occurred. Please try again later.";
  }
}

function isRetryableDefault(code: ErrorCode): boolean {
  return code === "EH-STORE" || code === "EH-SYS";
}

/** Map HTTP status → ErrorCode (ADS §10.3 / §10.5). */
export function errorCodeFromHttpStatus(status: number): ErrorCode {
  if (status === 401) return "EH-AUTH";
  if (status === 403) return "EH-FORB";
  if (status === 404 || status === 400 || status === 422 || status === 409) {
    return "EH-VAL";
  }
  if (status === 429) return "EH-SYS";
  if (status >= 500) return "EH-SYS";
  return "EH-SYS";
}

type AuthLikeError = {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
};

/**
 * Normalize Supabase Auth / GoTrue errors → ErrorObject (ADS §10.2).
 * Example: HTTP 401 / invalid credentials → EH-AUTH.
 */
export function fromAuthError(
  err: unknown,
  requestId?: string | null,
): ErrorObject {
  const e = (err ?? {}) as AuthLikeError;
  const status = typeof e.status === "number" ? e.status : 401;
  const code =
    status === 401 || status === 403
      ? status === 403
        ? "EH-FORB"
        : "EH-AUTH"
      : errorCodeFromHttpStatus(status);

  const authCode = (e.code ?? "").toLowerCase();
  const authMessage = (e.message ?? "").toLowerCase();
  const isAuth =
    code === "EH-AUTH" ||
    authCode.includes("auth") ||
    authMessage.includes("invalid login") ||
    authMessage.includes("jwt") ||
    authMessage.includes("session");

  return createErrorObject({
    code: isAuth ? "EH-AUTH" : code,
    message: e.message,
    request_id: requestId ?? null,
    retryable: false,
    details: e.code ? { vendor_code: e.code } : null,
  });
}

type PostgrestLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

/** Normalize PostgREST / RLS errors → ErrorObject. */
export function fromPostgrestError(
  err: unknown,
  requestId?: string | null,
): ErrorObject {
  const e = (err ?? {}) as PostgrestLikeError;
  const pgCode = e.code ?? "";
  // 42501 insufficient_privilege; PGRST301 JWT; RLS often surfaces as empty/permission
  const forbidden =
    pgCode === "42501" ||
    pgCode === "PGRST301" ||
    /permission|row-level security|rls|not authorized/i.test(
      `${e.message ?? ""} ${e.details ?? ""}`,
    );

  const code: ErrorCode = forbidden
    ? "EH-FORB"
    : pgCode === "23505" || pgCode === "23503" || pgCode === "22P02"
      ? "EH-VAL"
      : errorCodeFromHttpStatus(e.status ?? 400);

  return createErrorObject({
    code,
    message: e.message,
    request_id: requestId ?? null,
    details: {
      ...(pgCode ? { vendor_code: pgCode } : {}),
      ...(e.hint ? { hint: e.hint } : {}),
      ...(e.details ? { vendor_details: e.details } : {}),
    },
  });
}

type StorageLikeError = {
  message?: string;
  statusCode?: string | number;
  status?: number;
  error?: string;
};

/** Normalize Storage errors → EH-STORE (ADS §10.2). */
export function fromStorageError(
  err: unknown,
  requestId?: string | null,
): ErrorObject {
  const e = (err ?? {}) as StorageLikeError;
  const status =
    typeof e.status === "number"
      ? e.status
      : typeof e.statusCode === "number"
        ? e.statusCode
        : Number(e.statusCode) || 500;

  if (status === 401) {
    return createErrorObject({
      code: "EH-AUTH",
      message: e.message ?? e.error,
      request_id: requestId ?? null,
      retryable: false,
    });
  }
  if (status === 403) {
    return createErrorObject({
      code: "EH-FORB",
      message: e.message ?? e.error,
      request_id: requestId ?? null,
      retryable: false,
    });
  }

  return createErrorObject({
    code: "EH-STORE",
    message: e.message ?? e.error,
    request_id: requestId ?? null,
    retryable: status >= 500 || status === 429 || status === 408,
  });
}

/** Parse a JSON body that may already be an ErrorObject, else wrap. */
export function normalizeUnknownError(
  err: unknown,
  fallbackCode: ErrorCode = "EH-SYS",
  requestId?: string | null,
): ErrorObject {
  if (err && typeof err === "object" && "error" in err) {
    const body = (err as ErrorObject).error;
    if (body && typeof body === "object" && typeof body.code === "string") {
      return createErrorObject({
        code: body.code as ErrorCode,
        message: body.message,
        details: body.details,
        failure_code: body.failure_code,
        request_id: body.request_id ?? requestId,
        retryable: body.retryable,
      });
    }
  }

  if (err instanceof Error) {
    return createErrorObject({
      code: fallbackCode,
      message: err.message,
      request_id: requestId ?? null,
    });
  }

  return createErrorObject({
    code: fallbackCode,
    message: typeof err === "string" ? err : undefined,
    request_id: requestId ?? null,
  });
}

/** UI-safe message accessor — never returns stack traces. */
export function getSafeErrorMessage(err: ErrorObject | unknown): string {
  if (err && typeof err === "object" && "error" in err) {
    return (err as ErrorObject).error.message;
  }
  return createErrorObject({ code: "EH-SYS" }).error.message;
}
