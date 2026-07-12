/**
 * Analytics view normalization self-check — ADS §9.4 / TC-ANL-003.
 * Run: npm run test:analytics
 */
import { normalizeScoreBuckets } from "./normalization.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const buckets = normalizeScoreBuckets([
  { range: "81-100", count: "4" },
  { range: "0-20", count: 1 },
  { range: "61-80", count: null },
  { range: "unexpected", count: 999 },
]);

assert(buckets.length === 5, "all five score buckets");
assert(buckets[0]?.range === "0-20" && buckets[0]?.count === 1, "low bucket");
assert(
  buckets[1]?.range === "21-40" && buckets[1]?.count === 0,
  "missing bucket is zero",
);
assert(
  buckets[3]?.range === "61-80" && buckets[3]?.count === 0,
  "null count is zero",
);
assert(
  buckets[4]?.range === "81-100" && buckets[4]?.count === 4,
  "string count is numeric",
);

console.log("analytics/normalization.selftest: ok");
