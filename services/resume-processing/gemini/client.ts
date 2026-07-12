/**
 * Gemini HTTPS adapter — AID §4.6 / CP-21.
 * Secrets via Edge env only (BR-05).
 */
import type { PromptMessages } from "../types.ts";

export type GeminiConfig = {
  apiKey: string;
  model: string;
  timeoutMs: number;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
};

export type GeminiSuccess = {
  ok: true;
  text: string;
  model: string;
  latency_ms: number;
};

export type GeminiFailure = {
  ok: false;
  retryable: boolean;
  status?: number;
  message: string;
  latency_ms: number;
};

export type GeminiResult = GeminiSuccess | GeminiFailure;

function readRetryAfterMs(res: Response): number | null {
  const raw = res.headers.get("Retry-After");
  if (!raw) return null;
  const secs = Number(raw);
  if (Number.isFinite(secs) && secs >= 0) return secs * 1000;
  return null;
}

export async function callGemini(
  messages: PromptMessages,
  config: GeminiConfig,
): Promise<GeminiResult> {
  const started = Date.now();
  const model = config.model;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(config.apiKey)}`;

  const body = {
    systemInstruction: {
      parts: [{ text: `${messages.system}\n\n${messages.developer}` }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: messages.user }],
      },
    ],
    generationConfig: {
      temperature: config.temperature ?? 0.2,
      topP: config.topP ?? 0.9,
      maxOutputTokens: config.maxOutputTokens ?? 4096,
      responseMimeType: "application/json",
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const latency_ms = Date.now() - started;

    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;
      const retryAfter = readRetryAfterMs(res);
      return {
        ok: false,
        retryable,
        status: res.status,
        message: `Gemini HTTP ${res.status}${retryAfter != null ? ` retry_after_ms=${retryAfter}` : ""}`,
        latency_ms,
      };
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      error?: { message?: string };
    };

    const text =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "";

    if (!text.trim()) {
      const reason = json.candidates?.[0]?.finishReason ?? "empty";
      return {
        ok: false,
        retryable: reason !== "SAFETY",
        status: 200,
        message: `Gemini empty response (${reason})`,
        latency_ms,
      };
    }

    return { ok: true, text, model, latency_ms };
  } catch (err) {
    const latency_ms = Date.now() - started;
    const aborted =
      err instanceof Error &&
      (err.name === "AbortError" || /abort/i.test(err.message));
    return {
      ok: false,
      retryable: true,
      message: aborted
        ? "Gemini call timed out"
        : err instanceof Error
          ? err.message
          : "Gemini request failed",
      latency_ms,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with ±20% jitter — AID §10.2. */
export function backoffMs(attemptIndex: number): number {
  const base = attemptIndex === 0 ? 1000 : 3000;
  const jitter = base * (0.8 + Math.random() * 0.4);
  return Math.round(jitter);
}
