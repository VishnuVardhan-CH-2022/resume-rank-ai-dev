/**
 * RPS env/config helpers — DEP §6.2–6.3.
 */
export function readIntEnv(
  name: string,
  fallback: number,
  env: { get(key: string): string | undefined } = Deno.env,
): number {
  const raw = env.get(name)?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function readStringEnv(
  name: string,
  fallback: string | undefined,
  env: { get(key: string): string | undefined } = Deno.env,
): string {
  const value = env.get(name)?.trim() || fallback?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export type WorkerConfig = {
  geminiApiKey: string;
  geminiModel: string;
  aiMaxTransientRetries: number;
  aiCallTimeoutMs: number;
  queueVisibilityMs: number;
  geminiConcurrency: number;
  batchLimit: number;
};

export function loadWorkerConfig(
  env: { get(key: string): string | undefined } = Deno.env,
): WorkerConfig {
  return {
    geminiApiKey: readStringEnv("GEMINI_API_KEY", undefined, env),
    geminiModel: readStringEnv("GEMINI_MODEL", "gemini-2.0-flash", env),
    aiMaxTransientRetries: readIntEnv("AI_MAX_TRANSIENT_RETRIES", 2, env),
    aiCallTimeoutMs: readIntEnv("AI_CALL_TIMEOUT_MS", 60_000, env),
    queueVisibilityMs: readIntEnv("QUEUE_VISIBILITY_TIMEOUT_MS", 90_000, env),
    geminiConcurrency: readIntEnv("GEMINI_CONCURRENCY", 3, env),
    batchLimit: readIntEnv("QUEUE_CLAIM_LIMIT", 3, env),
  };
}
