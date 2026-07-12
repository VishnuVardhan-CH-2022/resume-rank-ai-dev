/**
 * Job validation self-check — UXD §8.2 / VR-01 / VR-02.
 * Run: npm run test:jobs
 */
import {
  trimJobFields,
  validateJobDescription,
  validateJobTitle,
} from "./validation.ts";
import { parseJobDetailTab } from "../types.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(validateJobTitle("  ") === "Title is required", "empty title");
assert(validateJobTitle("Engineer") === null, "title ok");
assert(
  validateJobDescription("") === "Job description is required",
  "empty jd",
);
assert(validateJobDescription(" Build APIs ") === null, "jd ok");

const trimmed = trimJobFields({ title: "  A  ", jd_text: "  B  " });
assert(trimmed.title === "A" && trimmed.jd_text === "B", "trim");

assert(parseJobDetailTab(null) === "overview", "default tab");
assert(parseJobDetailTab("upload") === "upload", "upload tab");
assert(parseJobDetailTab("bogus") === "overview", "invalid tab");

console.log("jobs.validation.selftest: ok");
