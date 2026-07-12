# Supabase (ResumeRank AI)

Phase 2 backend project layout per [RR-DEP-011](../docs/04-delivery/11-Deployment-Guide.md) §5 / §7 and [RR-DEV-012](../docs/04-delivery/12-Cursor-Developer-Guide.md) Phase 2.

## Layout

```text
supabase/
├── config.toml          # Local Auth/API/DB defaults (email/password enabled)
├── migrations/          # Phase 3+ SQL (empty until CP-06)
├── seed/                # Optional demo seeds
└── functions/           # Edge entrypoints (Phase 8–9)
    ├── screen-job/
    ├── retry-candidate/
    ├── resume-url/
    └── process-queue/
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

## Out of scope here

- Schema / RLS / analytics views → Phase 3 (see [`migrations/README.md`](./migrations/README.md))  
- Login/Signup screens + route guards → Phase 4  
- `resumes` bucket → Phase 5  
- Edge Functions + Gemini secrets → Phases 8–9  

## Phase 3 status

Migrations CP-06–CP-08 are in `migrations/`. Apply with `npx supabase db push` after linking (or `supabase db reset` locally with Docker).