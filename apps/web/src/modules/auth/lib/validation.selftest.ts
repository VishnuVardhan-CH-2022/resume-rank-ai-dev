/**
 * Auth validation self-check (UXD §8.1 / §8.1a).
 * Run: npm run test:auth
 */
import {
  validateEmail,
  validatePasswordConfirm,
  validatePasswordPolicy,
  validatePasswordRequired,
} from "./validation.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(validateEmail("") === "Enter a valid email", "empty email");
assert(validateEmail("bad") === "Enter a valid email", "bad email");
assert(validateEmail(" you@co.com ") === null, "valid email");

assert(validatePasswordRequired("") === "Password is required", "pwd required");
assert(validatePasswordPolicy("short1") !== null, "short password");
assert(validatePasswordPolicy("nodigits") !== null, "letters only");
assert(validatePasswordPolicy("12345678") !== null, "digits only");
assert(validatePasswordPolicy("Password1") === null, "policy ok");

assert(
  validatePasswordConfirm("Password1", "Password2") ===
    "Passwords do not match",
  "mismatch",
);
assert(validatePasswordConfirm("Password1", "Password1") === null, "match");

console.log("auth.validation.selftest: ok");
