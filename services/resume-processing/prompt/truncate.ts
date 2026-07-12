/**
 * Truncation policy — AID §4.7.
 * Approximate tokens as chars/4 for budget accounting.
 */
import { getMinUsableChars, normalizeResumeText } from "../parse/normalize.ts";

/** ~24k tokens input budget for JD + resume (AID §4.7). */
export const INPUT_TOKEN_BUDGET = 24_000;
const CHARS_PER_TOKEN = 4;
export const INPUT_CHAR_BUDGET = INPUT_TOKEN_BUDGET * CHARS_PER_TOKEN;

export type TruncationResult = {
  jd_text: string;
  resume_text: string;
  input_truncated: boolean;
  warnings: string[];
};

function truncateMiddle(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const head = Math.floor(maxChars * 0.6);
  const tail = maxChars - head - 20;
  return `${text.slice(0, head)}\n…[truncated]…\n${text.slice(-Math.max(0, tail))}`;
}

function truncateEnd(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 14))}\n…[truncated]`;
}

/**
 * Prefer keeping full JD; truncate resume from the end.
 * If JD alone exceeds budget, truncate JD from the middle.
 */
export function applyTruncationPolicy(
  jdText: string,
  resumeText: string,
  budgetChars: number = INPUT_CHAR_BUDGET,
): TruncationResult {
  const warnings: string[] = [];
  let jd = normalizeResumeText(jdText);
  let resume = normalizeResumeText(resumeText);
  let truncated = false;

  if (jd.length + resume.length <= budgetChars) {
    return { jd_text: jd, resume_text: resume, input_truncated: false, warnings };
  }

  if (jd.length >= budgetChars) {
    jd = truncateMiddle(jd, budgetChars);
    resume = "";
    truncated = true;
    warnings.push("Job description exceeded input budget and was truncated.");
  } else {
    const resumeBudget = budgetChars - jd.length;
    if (resume.length > resumeBudget) {
      resume = truncateEnd(resume, resumeBudget);
      truncated = true;
      warnings.push("Resume text was truncated to fit the input budget.");
    }
  }

  if (resume.length > 0 && resume.length < getMinUsableChars()) {
    // Unusable after truncation — caller treats as failed_parse
    warnings.push("Resume text below minimum usable length after truncation.");
  }

  return {
    jd_text: jd,
    resume_text: resume,
    input_truncated: truncated,
    warnings,
  };
}
