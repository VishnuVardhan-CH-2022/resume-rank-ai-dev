/**
 * Resume text normalization — AID §5.3.
 */

const MIN_USABLE_CHARS = 200;

export function normalizeResumeText(raw: string): string {
  let text = raw.normalize("NFC");
  // Strip NUL and most C0 controls; keep \n and \t
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  text = text.replace(/\r\n?/g, "\n");
  text = text.replace(/[^\S\n\t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export function isUsableResumeText(text: string): boolean {
  return text.trim().length >= MIN_USABLE_CHARS;
}

export function getMinUsableChars(): number {
  return MIN_USABLE_CHARS;
}
