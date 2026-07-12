# Supabase (ResumeRank AI)

Phase 2 backend project layout per [RR-DEP-011](../docs/04-delivery/11-Deployment-Guide.md) §5 / §7 and [RR-DEV-012](../docs/04-delivery/12-Cursor-Developer-Guide.md) Phase 2.

## Layout

```text
supabase/
├── config.toml          # Local Auth/API/DB defaults (email/password enabled)
├── migrations/          # Phase 3+ SQL (empty until CP-06)
├── seed/                # Optional demo seeds
└── functions/           # Edge entrypoints (Phase 8–9)
    ├── _shared/         # JWT, idempotency, enqueue, ErrorObject
    ├── screen-job/      # POST → 202 (uploaded|queued)
    ├── retry-candidate/ # POST → 202 (failed_ai only)
    ├── resume-url/      # GET → signed URL (default 300s)
    └── process-queue/   # Phase 9 worker (not Phase 8)
```

## Auth defaults (local `config.toml`)

| Setting | Value | Source |
| --- | --- | --- |
| Provider | Email / password | DEP §7.2, SEC SA-05 |
| `site_url` | `http://127.0.0.1:5173` | Vite SPA |
| Min password length | 8 + `letters_digits` | SEC SA-05 |
| Email confirmations | Off for local demo | DEP §7.2 |

Remote hosted projects must mirror these in the Supabase Dashboard (Authentication → Providers → Email).

## Developer setup

### 1. Create hosted project(s)

Per DEP §4 / §7.1: create preview and production projects. Record:

- Project URL → `VITE_SUPABASE_URL`
- anon (public) key → `VITE_SUPABASE_ANON_KEY`
- service_role key → Edge secrets only (never Vite)

### 2. SPA env (do not commit)

```bash
cp .env.example apps/web/.env
# edit apps/web/.env — fill only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for Phase 2
```

### 3. Link CLI to remote

```bash
npx supabase login
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase projects list
```

### 4. Local stack (optional; requires Docker)

```bash
npx supabase start
npx supabase status
```

Use the printed `API URL` and `anon key` in `apps/web/.env` when developing against local Supabase.

### 5. Verify browser client

```bash
cd apps/web && npm run build
npm run test:errors
```

With `.env` set, open `/login` — connection strip shows **configured** when public env is present. Full Auth UI is Phase 4.

## Phase 8 Edge commands

| Function | ADS | Notes |
| --- | --- | --- |
| `screen-job` | `POST /jobs/{job_id}/screen` | Body `{ job_id, candidate_ids? }` + `Idempotency-Key` → **202** |
| `retry-candidate` | `POST /candidates/{id}/retry` | Body `{ candidate_id }` + `Idempotency-Key` → **202** |
| `resume-url` | `GET /candidates/{id}/resume` | Query `candidate_id` → signed URL `expires_in` (default 300) |

```bash
# After secrets are set (never put service_role / Gemini in Vite):
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... SIGNED_URL_EXPIRES_IN=300 IDEMPOTENCY_TTL_HOURS=24 --project-ref <ref>
supabase functions deploy screen-job --project-ref <ref>
supabase functions deploy retry-candidate --project-ref <ref>
supabase functions deploy resume-url --project-ref <ref>
```

Self-check (no Docker required):

```bash
npx tsx supabase/functions/_shared/hashing.selftest.ts
cd apps/web && npm run test:rps
```

## Phase 12 QA seed + fixtures (CP-30)

`supabase/seed/001_phase12_demo_dataset.sql` seeds:

- one primary demo job (+ one secondary owner-scope job when a second profile exists)
- 20 uploaded candidates for batch-capacity QA
- completed / failed_ai / failed_parse fixtures for ranking and retry flows
- deterministic `resumes/{owner}/{job}/{candidate}/{file}` paths for validation checks

Fixture file path catalog lives in [`../test-fixtures/resumes/paths.txt`](../test-fixtures/resumes/paths.txt).

```bash
# After creating at least one auth user profile:
npx supabase db reset
```

## Phase 9 AI worker

| Piece | Notes |
| --- | --- |
| Migration | `claim_processing_queue` + `extend_processing_queue_lock` (SKIP LOCKED) |
| Function | `process-queue` — Bearer = `SUPABASE_SERVICE_ROLE_KEY` only |
| Modules | `services/resume-processing/*` (parse → prompt → Gemini → validate → persist) |
| Versions | `rr-ai-prompt-1.0.0` / `rr-ai-response-1.0.0` |

```bash
supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=... \
  GEMINI_API_KEY=... \
  GEMINI_MODEL=gemini-2.0-flash \
  AI_MAX_TRANSIENT_RETRIES=2 \
  AI_CALL_TIMEOUT_MS=60000 \
  QUEUE_VISIBILITY_TIMEOUT_MS=90000 \
  GEMINI_CONCURRENCY=3 \
  --project-ref <ref>
supabase db push --project-ref <ref>
supabase functions deploy process-queue --project-ref <ref>

# Manual / cron invoke (service role key):
curl -X POST "$SUPABASE_URL/functions/v1/process-queue" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Out of scope here

- Schema / RLS / analytics views → Phase 3 (see [`migrations/README.md`](./migrations/README.md))  
- Login/Signup screens + route guards → Phase 4  
- Upload UI → Phase 7  
- Progress polling UI → CP-23  
- Ranking UI → Phase 10  

## Phase 3–5 status

- Migrations CP-06–CP-08 + Phase 5 Storage bucket are in `migrations/`.  
- Apply with `npx supabase db push` after linking (or `supabase db reset` locally with Docker).  
- SPA path helper: `apps/web/src/lib/storagePaths.ts` (`npm run test:storage`).

### Storage path (frozen)

| Layer | Value |
| --- | --- |
| Bucket | `resumes` (private) |
| Object key | `{owner_id}/{job_id}/{candidate_id}/{uuid_filename}` |
| Logical (DDD) | `resumes/{owner_id}/{job_id}/{candidate_id}/{filename}` |
| MIME / size | PDF/DOCX · ≤ 5 MB |