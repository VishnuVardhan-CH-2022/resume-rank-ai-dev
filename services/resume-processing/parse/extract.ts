/**
 * PDF / DOCX extraction — AID §5 / CP-19.
 * Uses npm:pdf-parse and npm:mammoth (Deno Edge packaging).
 */
import { isUsableResumeText, normalizeResumeText } from "./normalize.ts";
import type { ParseResult } from "../types.ts";

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function parseFailure(message: string): ParseResult {
  return {
    ok: false,
    failure_code: "EH-PARSE",
    failure_message: message,
  };
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  const mod = await import("npm:pdf-parse@1.1.1");
  const pdfParse = (mod as { default?: (b: Uint8Array) => Promise<{ text?: string }> })
    .default ?? (mod as unknown as (b: Uint8Array) => Promise<{ text?: string }>);
  const result = await pdfParse(bytes);
  return result?.text ?? "";
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  const mammoth = await import("npm:mammoth@1.9.0");
  const extractRawText =
    (mammoth as { extractRawText?: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> })
      .extractRawText ??
    (mammoth as { default?: { extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> } })
      .default?.extractRawText;
  if (!extractRawText) {
    throw new Error("mammoth.extractRawText unavailable");
  }
  const ab = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const result = await extractRawText({ arrayBuffer: ab });
  return result.value ?? "";
}

export async function extractResumeText(
  bytes: Uint8Array,
  mimeType: string,
): Promise<ParseResult> {
  const mime = (mimeType || "").toLowerCase().trim();
  try {
    let raw = "";
    if (mime === PDF_MIME || mime.endsWith("/pdf")) {
      raw = await extractPdf(bytes);
    } else if (
      mime === DOCX_MIME ||
      mime.includes("wordprocessingml") ||
      mime.includes("officedocument")
    ) {
      raw = await extractDocx(bytes);
    } else {
      return parseFailure("Unsupported resume type for parsing.");
    }

    const text = normalizeResumeText(raw);
    if (!isUsableResumeText(text)) {
      return parseFailure(
        "Resume text could not be extracted. Re-upload a text-based PDF or DOCX.",
      );
    }
    return { ok: true, text, mime_type: mime || PDF_MIME };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "parse error";
    console.error("resume_extract_failed", { message: msg.slice(0, 120) });
    return parseFailure(
      "Resume parsing failed. Re-upload a readable PDF or DOCX.",
    );
  }
}

export { normalizeResumeText, isUsableResumeText };
