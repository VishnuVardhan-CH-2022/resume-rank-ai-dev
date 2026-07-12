# Resume Processing Service (RPS)

Phase 9 AI pipeline modules for ResumeRank AI (RR-DEV-012 CP-19–CP-22 / RR-AI-008).

```text
services/resume-processing/
  parse/       # pdf-parse + mammoth + normalize (AID §5)
  prompt/      # rr-ai-prompt-1.0.0 assembly + truncation (AID §4)
  gemini/      # HTTPS Gemini adapter (BR-05 secrets)
  validate/    # rr-ai-response-1.0.0 + V-SC-01..03
  persist/     # CE + evaluations + history (BR-12)
  pipeline.ts  # Claimed-item orchestration
  config.ts    # Edge env defaults (DEP §6)
```

Entrypoint: `supabase/functions/process-queue` (service-role Bearer only).

Never import this package from `apps/web` production code — Gemini keys stay Edge-only.
