/**
 * Storage path helper self-check — RR-DEV-012 CP-14.
 * Run: npm run test:storage
 */
import {
  RESUMES_BUCKET,
  assertOwnerOwnsPath,
  buildResumeObjectKey,
  buildResumeStoragePath,
  isAllowedResumeMimeType,
  isWithinUploadSizeLimit,
  makeCollisionSafeFilename,
  sanitizeOriginalFilename,
  toResumeLogicalPath,
  toResumeObjectKey,
  UPLOAD_MAX_BYTES,
} from "./storagePaths.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const owner = "11111111-1111-1111-1111-111111111111";
const job = "22222222-2222-2222-2222-222222222222";
const cand = "33333333-3333-3333-3333-333333333333";
const uniq = "44444444-4444-4444-a444-444444444444";

assert(sanitizeOriginalFilename("../../evil.pdf") === "evil.pdf", "sanitize path");
assert(
  makeCollisionSafeFilename("My Resume.pdf", uniq) === `${uniq}_My Resume.pdf`,
  "collision-safe name",
);

const parts = {
  ownerId: owner,
  jobId: job,
  candidateId: cand,
  objectFilename: makeCollisionSafeFilename("cv.pdf", uniq),
};

const key = buildResumeObjectKey(parts);
assert(
  key === `${owner}/${job}/${cand}/${uniq}_cv.pdf`,
  "object key shape",
);

const logical = buildResumeStoragePath(parts);
assert(
  logical === `${RESUMES_BUCKET}/${owner}/${job}/${cand}/${uniq}_cv.pdf`,
  "logical DDD path",
);
assert(toResumeObjectKey(logical) === key, "strip bucket prefix");
assert(toResumeLogicalPath(key) === logical, "add bucket prefix");

assertOwnerOwnsPath(owner, logical);
let threw = false;
try {
  assertOwnerOwnsPath("55555555-5555-5555-5555-555555555555", logical);
} catch {
  threw = true;
}
assert(threw, "foreign owner rejected");

assert(isAllowedResumeMimeType("application/pdf"), "pdf ok");
assert(!isAllowedResumeMimeType("text/plain"), "txt denied");
assert(isWithinUploadSizeLimit(1024), "size ok");
assert(!isWithinUploadSizeLimit(UPLOAD_MAX_BYTES + 1), "oversize denied");
assert(!isWithinUploadSizeLimit(0), "empty denied");

console.log("storagePaths.selftest: ok");
