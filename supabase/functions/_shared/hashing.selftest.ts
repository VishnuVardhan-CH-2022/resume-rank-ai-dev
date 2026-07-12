/**
 * Idempotency canonicalization self-check — ADS §8.8 / TC-SCR-004–005.
 * Run: cd apps/web && npm run test:screening
 */
import {
  canonicalizeRetryBody,
  canonicalizeScreenBody,
  hashCanonicalBody,
} from "./hashing.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const a = canonicalizeScreenBody({
    job_id: "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA",
    candidate_ids: [
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    ],
  });
  const b = canonicalizeScreenBody({
    job_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    candidate_ids: [
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    ],
  });
  assert(a === b, "screen body order-independent");

  const c = canonicalizeScreenBody({
    job_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    candidate_ids: null,
  });
  const d = canonicalizeScreenBody({
    job_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  });
  assert(c === d, "omit vs null candidate_ids");

  const ha = await hashCanonicalBody(a);
  const hb = await hashCanonicalBody(b);
  assert(ha === hb, "same hash for equivalent screen bodies");

  const different = await hashCanonicalBody(
    canonicalizeScreenBody({
      job_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      candidate_ids: ["cccccccc-cccc-cccc-cccc-cccccccccccc"],
    }),
  );
  assert(ha !== different, "different body → different hash");

  const r1 = canonicalizeRetryBody("DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD");
  const r2 = canonicalizeRetryBody("dddddddd-dddd-dddd-dddd-dddddddddddd");
  assert(r1 === r2, "retry id case-normalized");

  console.log("hashing.selftest: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
