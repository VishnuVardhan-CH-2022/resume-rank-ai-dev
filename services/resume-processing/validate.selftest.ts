/**
 * Validation gate self-check — V-SC-01..03 (AID §9).
 * Run: cd apps/web && npm run test:validate
 */
import { PROMPT_VERSION, SCHEMA_VERSION } from "./types.ts";
import { validateAiResponse } from "./validate/index.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const outOfRange = validateAiResponse(
  JSON.stringify({
    schema_version: SCHEMA_VERSION,
    candidate_profile: {
      skills: [],
      education: [],
      experience: [],
      certifications: [],
      projects: [],
      languages: [],
    },
    evaluation: {
      match_score: 150,
      summary: "Summary",
      rationale: "Rationale",
      reasons: ["Reason"],
    },
    validation_metadata: {
      prompt_version: PROMPT_VERSION,
      schema_version: SCHEMA_VERSION,
      model_requested: "gemini-2.0-flash",
    },
  }),
);
assert(outOfRange.ok === false, "reject out-of-range score");

const emptyRationale = validateAiResponse(
  JSON.stringify({
    schema_version: SCHEMA_VERSION,
    candidate_profile: {
      skills: [],
      education: [],
      experience: [],
      certifications: [],
      projects: [],
      languages: [],
    },
    evaluation: {
      match_score: 80,
      summary: "Has summary",
      rationale: "",
      reasons: ["Reason"],
    },
  }),
);
assert(emptyRationale.ok === false, "reject empty rationale");

const emptySummary = validateAiResponse(
  JSON.stringify({
    schema_version: SCHEMA_VERSION,
    candidate_profile: {
      skills: [],
      education: [],
      experience: [],
      certifications: [],
      projects: [],
      languages: [],
    },
    evaluation: {
      match_score: 80,
      summary: "",
      rationale: "Has rationale",
      reasons: ["Reason"],
    },
  }),
);
assert(emptySummary.ok === false, "reject empty summary");

const valid = validateAiResponse(
  JSON.stringify({
    schema_version: SCHEMA_VERSION,
    candidate_profile: {
      name: "Jordan Lee",
      email: "jordan@example.com",
      skills: ["TypeScript"],
      education: [],
      experience: [],
      certifications: [],
      projects: [],
      languages: [],
    },
    evaluation: {
      match_score: 87,
      summary: "Strong fit.",
      rationale: "Resume shows strong overlap with role needs.",
      reasons: ["Skill overlap"],
      warnings: [],
      dimension_hints: {
        skill_match: 90,
        experience_match: 85,
        education_match: null,
        keyword_alignment: 88,
      },
    },
    validation_metadata: {
      prompt_version: PROMPT_VERSION,
      schema_version: SCHEMA_VERSION,
      model_requested: "gemini-2.0-flash",
    },
  }),
);
assert(valid.ok === true, "accept valid response");

console.log("validate.selftest: ok");
