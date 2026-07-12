/**
 * Upload validation self-check — RR-DEV-012 CP-13 / TC-UPL-003–006.
 * Run: npm run test:uploads
 */
import {
  BATCH_GUIDANCE_THRESHOLD,
  resolveResumeMimeType,
  shouldWarnLargeBatch,
  validateResumeFile,
} from "./validation.ts";
import { UPLOAD_MAX_BYTES } from "../../../lib/storagePaths.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  resolveResumeMimeType({ name: "a.pdf", type: "" }) === "application/pdf",
  "infer pdf mime",
);
assert(
  resolveResumeMimeType({
    name: "a.docx",
    type: "",
  }) ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "infer docx mime",
);

const pdfOk = validateResumeFile({
  name: "resume.pdf",
  type: "application/pdf",
  size: 1024,
});
assert(pdfOk.ok === true, "pdf accepted");

const docxOk = validateResumeFile({
  name: "resume.docx",
  type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  size: 2048,
});
assert(docxOk.ok === true, "docx accepted");

const txt = validateResumeFile({
  name: "notes.txt",
  type: "text/plain",
  size: 10,
});
assert(txt.ok === false, "txt rejected");
if (!txt.ok) {
  assert(txt.error.error.code === "EH-VAL", "txt → EH-VAL");
  assert(txt.error.error.details?.http_hint === 422, "txt http_hint 422");
}

const png = validateResumeFile({
  name: "photo.png",
  type: "image/png",
  size: 100,
});
assert(png.ok === false, "png rejected");

const empty = validateResumeFile({
  name: "empty.pdf",
  type: "application/pdf",
  size: 0,
});
assert(empty.ok === false, "empty rejected");

const huge = validateResumeFile({
  name: "big.pdf",
  type: "application/pdf",
  size: UPLOAD_MAX_BYTES + 1,
});
assert(huge.ok === false, "oversize rejected");

assert(!shouldWarnLargeBatch(19), "no warn under 20");
assert(shouldWarnLargeBatch(BATCH_GUIDANCE_THRESHOLD), "warn at 20");

console.log("uploads/validation.selftest: ok");
