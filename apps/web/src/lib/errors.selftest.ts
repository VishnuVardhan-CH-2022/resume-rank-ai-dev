/**
 * Lightweight self-check for ErrorObject mapping (RR-DEV-012 CP-05).
 * Run: npx tsx src/lib/errors.selftest.ts
 */
import {
  createErrorObject,
  errorCodeFromHttpStatus,
  fromAuthError,
  fromPostgrestError,
  fromStorageError,
  getSafeErrorMessage,
} from "./errors.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const auth401 = fromAuthError({
  message: "Invalid login credentials",
  status: 401,
  code: "invalid_credentials",
});
assert(auth401.error.code === "EH-AUTH", "401 auth → EH-AUTH");
assert(!auth401.error.retryable, "auth not retryable");

assert(errorCodeFromHttpStatus(401) === "EH-AUTH", "status map 401");
assert(errorCodeFromHttpStatus(403) === "EH-FORB", "status map 403");
assert(errorCodeFromHttpStatus(429) === "EH-SYS", "status map 429");

const rls = fromPostgrestError({
  message: "new row violates row-level security policy",
  code: "42501",
});
assert(rls.error.code === "EH-FORB", "RLS → EH-FORB");

const store = fromStorageError({ message: "Upload failed", status: 503 });
assert(store.error.code === "EH-STORE", "storage → EH-STORE");
assert(store.error.retryable === true, "503 store retryable");

const wrapped = createErrorObject({
  code: "EH-VAL",
  message: "title is required",
  details: { field: "title", reason: "required" },
});
assert(getSafeErrorMessage(wrapped) === "title is required", "safe message");

console.log("errors.selftest: ok");
