/**
 * Job form validation — UXD §8.2 / VR-01 / VR-02
 */

export function validateJobTitle(title: string): string | null {
  if (!title.trim()) return "Title is required";
  return null;
}

export function validateJobDescription(jdText: string): string | null {
  if (!jdText.trim()) return "Job description is required";
  return null;
}

export function trimJobFields(input: {
  title: string;
  jd_text: string;
}): { title: string; jd_text: string } {
  return {
    title: input.title.trim(),
    jd_text: input.jd_text.trim(),
  };
}
