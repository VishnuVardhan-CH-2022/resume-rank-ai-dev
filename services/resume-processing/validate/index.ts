/**
 * Response validation — AID §9 / schema rr-ai-response-1.0.0 / V-SC-01..03.
 */
import {
  PROMPT_VERSION,
  SCHEMA_VERSION,
  type CanonicalAiResponse,
  type CandidateProfilePayload,
  type EvaluationPayload,
} from "../types.ts";

export type ValidationSuccess = {
  ok: true;
  payload: CanonicalAiResponse;
  warnings: string[];
};

export type ValidationFailure = {
  ok: false;
  reason: string;
};

export type ValidationResult = ValidationSuccess | ValidationFailure;

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

function stripFences(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return text.trim();
}

function asStringOrNull(value: unknown, max = 2000): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const cleaned = stripHtml(value).slice(0, max);
  return cleaned.length ? cleaned : null;
}

function asStringArray(value: unknown, maxItems = 100, maxLen = 80): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const s = stripHtml(item).slice(0, maxLen);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

function basicEmail(value: string | null): string | null {
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value.slice(0, 254);
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function normalizeProfile(raw: unknown): CandidateProfilePayload {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const education = Array.isArray(src.education)
    ? src.education.map((e) => {
        const row = (e && typeof e === "object" ? e : {}) as Record<
          string,
          unknown
        >;
        return {
          institution: asStringOrNull(row.institution, 200),
          degree: asStringOrNull(row.degree, 120),
          field: asStringOrNull(row.field, 120),
          start_year: asNumberOrNull(row.start_year),
          end_year: asNumberOrNull(row.end_year),
        };
      })
    : [];

  const experience = Array.isArray(src.experience)
    ? src.experience.map((e) => {
        const row = (e && typeof e === "object" ? e : {}) as Record<
          string,
          unknown
        >;
        return {
          company: asStringOrNull(row.company, 200),
          title: asStringOrNull(row.title, 200),
          start_date: asStringOrNull(row.start_date, 40),
          end_date: asStringOrNull(row.end_date, 40),
          highlights: asStringArray(row.highlights, 10, 240),
        };
      })
    : [];

  const projects = Array.isArray(src.projects)
    ? src.projects.map((p) => {
        const row = (p && typeof p === "object" ? p : {}) as Record<
          string,
          unknown
        >;
        return {
          name: asStringOrNull(row.name, 200),
          description: asStringOrNull(row.description, 500),
          technologies: asStringArray(row.technologies, 40, 80),
        };
      })
    : [];

  const certificationsRaw = src.certifications;
  let certifications: string[] = [];
  if (Array.isArray(certificationsRaw)) {
    for (const c of certificationsRaw) {
      if (typeof c === "string") {
        const s = stripHtml(c).slice(0, 120);
        if (s) certifications.push(s);
      } else if (c && typeof c === "object" && "name" in c) {
        const s = asStringOrNull((c as { name: unknown }).name, 120);
        if (s) certifications.push(s);
      }
      if (certifications.length >= 50) break;
    }
  }

  return {
    name: asStringOrNull(src.name, 200),
    email: basicEmail(asStringOrNull(src.email, 254)),
    phone: asStringOrNull(src.phone, 40),
    skills: asStringArray(src.skills, 100, 80),
    education,
    experience,
    certifications,
    projects,
    resume_summary: asStringOrNull(src.resume_summary, 1000),
    linkedin: asStringOrNull(src.linkedin, 300),
    github: asStringOrNull(src.github, 300),
    portfolio: asStringOrNull(src.portfolio, 300),
    languages: asStringArray(src.languages, 30, 40),
    location: asStringOrNull(src.location, 200),
  };
}

function normalizeEvaluation(
  raw: unknown,
): { ok: true; evaluation: EvaluationPayload } | { ok: false; reason: string } {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const score = src.match_score;
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return { ok: false, reason: "V-SC-01: match_score missing or not a number" };
  }
  if (score < 0 || score > 100) {
    return { ok: false, reason: "V-SC-01: match_score out of range [0,100]" };
  }

  const rationale = asStringOrNull(src.rationale, 8000);
  if (!rationale) {
    return { ok: false, reason: "V-SC-02: rationale empty" };
  }
  const summary = asStringOrNull(src.summary, 4000);
  if (!summary) {
    return { ok: false, reason: "V-SC-03: summary empty" };
  }

  const reasons = asStringArray(src.reasons, 12, 400);
  if (reasons.length === 0) {
    return { ok: false, reason: "V-SC-04: reasons empty" };
  }

  const hintsRaw =
    src.dimension_hints && typeof src.dimension_hints === "object"
      ? (src.dimension_hints as Record<string, unknown>)
      : {};

  const clampHint = (v: unknown): number | null => {
    const n = asNumberOrNull(v);
    if (n == null) return null;
    if (n < 0 || n > 100) return null;
    return n;
  };

  return {
    ok: true,
    evaluation: {
      match_score: score,
      summary,
      rationale,
      reasons,
      warnings: asStringArray(src.warnings, 20, 400),
      dimension_hints: {
        skill_match: clampHint(hintsRaw.skill_match),
        experience_match: clampHint(hintsRaw.experience_match),
        education_match: clampHint(hintsRaw.education_match),
        keyword_alignment: clampHint(hintsRaw.keyword_alignment),
      },
    },
  };
}

/** Validate raw Gemini text → canonical payload (V-GATE-01). */
export function validateAiResponse(rawText: string): ValidationResult {
  const warnings: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(rawText));
  } catch {
    return { ok: false, reason: "V-JSON-01: malformed JSON" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "V-JSON-01: root must be an object" };
  }

  const root = parsed as Record<string, unknown>;
  const allowed = new Set([
    "schema_version",
    "candidate_profile",
    "evaluation",
    "validation_metadata",
  ]);
  for (const key of Object.keys(root)) {
    if (!allowed.has(key)) {
      delete root[key];
      warnings.push(`stripped unexpected key: ${key}`);
    }
  }

  // Forbidden decision fields anywhere at top level already stripped;
  // also reject if evaluation contains hire/reject.
  const evalRaw = root.evaluation;
  if (evalRaw && typeof evalRaw === "object") {
    const e = evalRaw as Record<string, unknown>;
    for (const forbidden of ["decision", "hire", "reject", "rank_override"]) {
      if (forbidden in e) {
        delete e[forbidden];
        warnings.push(`stripped forbidden evaluation key: ${forbidden}`);
      }
    }
  }

  const evalResult = normalizeEvaluation(root.evaluation);
  if (!evalResult.ok) {
    return { ok: false, reason: evalResult.reason };
  }

  const profile = normalizeProfile(root.candidate_profile);
  const metaRaw =
    root.validation_metadata && typeof root.validation_metadata === "object"
      ? (root.validation_metadata as Record<string, unknown>)
      : {};

  const payload: CanonicalAiResponse = {
    schema_version: SCHEMA_VERSION,
    candidate_profile: profile,
    evaluation: evalResult.evaluation,
    validation_metadata: {
      prompt_version:
        typeof metaRaw.prompt_version === "string"
          ? metaRaw.prompt_version
          : PROMPT_VERSION,
      schema_version: SCHEMA_VERSION,
      model_requested:
        typeof metaRaw.model_requested === "string"
          ? metaRaw.model_requested
          : null,
    },
  };

  return { ok: true, payload, warnings };
}
