/**
 * Eligibility helper self-check — ADS §8.0 / §8.3.
 * Run: cd apps/web && npm run test:eligibility
 */
import {
  isRetryEligibleStatus,
  isScreenEligibleStatus,
} from "./eligibility.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(isScreenEligibleStatus("uploaded"), "uploaded is screen eligible");
assert(isScreenEligibleStatus("queued"), "queued is screen eligible");
assert(!isScreenEligibleStatus("completed"), "completed not screen eligible");
assert(!isScreenEligibleStatus("failed_parse"), "failed_parse not screen eligible");

assert(isRetryEligibleStatus("failed_ai"), "failed_ai is retry eligible");
assert(!isRetryEligibleStatus("failed_parse"), "failed_parse not retry eligible");
assert(!isRetryEligibleStatus("completed"), "completed not retry eligible");

console.log("eligibility.selftest: ok");
