/**
 * Shared RPS types — AID §8 / DDD evaluation + CE.
 */

export const PROMPT_VERSION = "rr-ai-prompt-1.0.0" as const;
export const SCHEMA_VERSION = "rr-ai-response-1.0.0" as const;

export type EducationEntry = {
  institution: string | null;
  degree: string | null;
  field: string | null;
  start_year: number | null;
  end_year: number | null;
};

export type ExperienceEntry = {
  company: string | null;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  highlights: string[];
};

export type ProjectEntry = {
  name: string | null;
  description: string | null;
  technologies: string[];
};

export type CandidateProfilePayload = {
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  certifications: string[];
  projects: ProjectEntry[];
  resume_summary: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  languages: string[];
  location: string | null;
};

export type EvaluationPayload = {
  match_score: number;
  summary: string;
  rationale: string;
  reasons: string[];
  warnings: string[];
  dimension_hints: {
    skill_match: number | null;
    experience_match: number | null;
    education_match: number | null;
    keyword_alignment: number | null;
  };
};

export type CanonicalAiResponse = {
  schema_version: typeof SCHEMA_VERSION;
  candidate_profile: CandidateProfilePayload;
  evaluation: EvaluationPayload;
  validation_metadata: {
    prompt_version: string;
    schema_version: string;
    model_requested: string | null;
  };
};

export type ModelMetadata = {
  model: string;
  prompt_version: string;
  schema_version: string;
  timings_ms: {
    extract: number;
    gemini: number;
    validate: number;
    persist: number;
  };
  input_truncated: boolean;
  repair_attempt?: boolean;
  explainability: {
    reasons: string[];
    warnings: string[];
    dimension_hints: EvaluationPayload["dimension_hints"];
  };
};

export type PromptMessages = {
  system: string;
  developer: string;
  user: string;
  prompt_version: typeof PROMPT_VERSION;
  input_truncated: boolean;
  warnings: string[];
};

export type ParseSuccess = {
  ok: true;
  text: string;
  mime_type: string;
};

export type ParseFailure = {
  ok: false;
  failure_code: "EH-PARSE";
  failure_message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;
