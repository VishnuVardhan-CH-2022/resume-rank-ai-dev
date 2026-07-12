# Phase 13 — Manual Deployment Runbook

Document ID: RR-DEP-011 Phase 13 execution artifact  
Sources: RR-DEV-012 Phase 13, RR-DEP-011 §2.3/§6/§8/§9/§10/§13/§19

## 1) Purpose

Provide a practical **manual** deployment process for ResumeRank AI that follows the frozen architecture:

1. DB migrations first  
2. Storage + RLS ready  
3. Edge secrets + functions  
4. Vercel SPA deploy  
5. AC-G smoke verification

Do not change API contracts, statuses, or product behavior during this process.

---

## 2) Prerequisites

## Required tools

- Node.js 20+
- npm 10+
- Supabase CLI (latest stable)
- Vercel account + project access
- GitHub repo access

## Required accounts/projects

- Supabase **preview** project
- Supabase **production** project
- Google Gemini API key
- Vercel project with root `apps/web`

## Required secrets split

### Vercel (public only)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Supabase Edge secrets (server only)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- operational knobs (`UPLOAD_MAX_BYTES`, retries, timeouts, concurrency, signed URL TTL, idempotency TTL)

Never put Gemini or service-role secrets in Vercel/public env.

---

## 3) Phase 13 execution order

### Step A — local preflight on current branch

```bash
bash scripts/phase13-preflight.sh
```

Expected:

- lint/build/tests pass
- bundle secret scan passes

### Step B — deploy preview Supabase stack (DB + functions)

Set environment variables in your shell first:

```bash
export SUPABASE_PROJECT_REF=<preview_ref>
export SUPABASE_URL=<preview_project_url>
export SUPABASE_SERVICE_ROLE_KEY=<preview_service_role>
export GEMINI_API_KEY=<gemini_key>
export GEMINI_MODEL=gemini-2.0-flash
```

Then run:

```bash
bash scripts/phase13-deploy-supabase.sh
```

This runs:

1. `supabase link --project-ref <ref>`
2. `supabase db push`
3. `supabase secrets set ...`
4. `supabase functions deploy screen-job`
5. `supabase functions deploy retry-candidate`
6. `supabase functions deploy resume-url`
7. `supabase functions deploy process-queue`

### Step C — configure Vercel preview

1. Vercel project root: `apps/web`
2. Node runtime: 20
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set preview env:
   - `VITE_SUPABASE_URL` = preview Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = preview anon key
6. Deploy preview and verify HTTPS URL.

### Step D — run preview smoke (AC-G01..AC-G10 map)

Use RR-DEP-011 §13.2 and the template in:

- `docs/04-delivery/phase-13-smoke-report-template.md`

Mandatory checks include:

- upload does not enqueue (`TC-UPL-009`)
- screen/retry return 202 without scores (`TC-SCR-002`)
- cross-user denial (AUTHZ suite)
- bundle secret scan clean (`AC-G09`)

### Step E — production release

After preview smoke passes:

1. Repeat Step B against production Supabase project ref
2. Set Vercel **production** env (`VITE_*` only)
3. Deploy to production
4. Add production domain to Supabase Auth redirect allow-list
5. Re-run smoke report on production URL
6. Complete DEP §19 checklist and create release tag

---

## 4) Rollback plan (manual)

If release is unhealthy:

1. Roll back SPA in Vercel by promoting previous deployment
2. Redeploy prior Edge function artifacts from known-good commit/tag
3. Restore DB only if schema incompatibility requires it
4. Re-verify: auth, jobs list, upload, screen, ranking

Use DEP §16 as source of truth.

---

## 5) Definition of done (Phase 13)

Phase 13 is complete when:

- preview and production URLs serve working app over HTTPS
- DEP §19 checklist items are all marked done
- AC-G01..AC-G10 smoke report is pass with evidence
- no Gemini/service-role secret appears in client bundle
