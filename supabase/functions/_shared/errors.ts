/**
 * ErrorObject responses — ADS §10.1 (Edge-side mirror of SPA lib/errors).
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

export type ErrorObject = { error: ErrorObjectBody };

const SAFE_MESSAGE_MAX = 280;

function sanitizeMessage(message: string, fallback: string): string {
  const trimmed = message.replace(/\s+/g, " ").trim();
  if (!trimmed) return fallback;
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
