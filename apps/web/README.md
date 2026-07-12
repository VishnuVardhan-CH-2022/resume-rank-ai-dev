# ResumeRank AI — Web SPA

React + TypeScript + Vite + Tailwind CSS + shadcn/ui.

## Setup

```bash
cd apps/web
cp .env.example .env   # set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Only `VITE_*` keys belong in the Vite client. Edge secrets stay in Supabase secrets (see root [`.env.example`](../../.env.example) and [`supabase/README.md`](../../supabase/README.md)).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Vite server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Oxlint |
| `npm test` | Aggregate Phase 12 selftest suite + bundle scan |
| `npm run test:errors` | ErrorObject mapping self-check (CP-05) |
| `npm run test:auth` | Auth validation self-check (CP-09) |
| `npm run test:storage` | Storage path helper self-check (CP-14) |
| `npm run test:jobs` | Job form validation self-check (CP-11) |
| `npm run test:uploads` | Upload validation self-check (CP-19) |
| `npm run test:screening` | Idempotency hashing self-check (CP-21) |
| `npm run test:rps` | Resume-processing prompt/validation self-check (Phase 9) |
| `npm run test:ranking` | Ranking status utility self-check (Phase 10) |
| `npm run test:analytics` | Analytics normalization self-check (Phase 11) |
| `npm run test:eligibility` | Screen/retry status eligibility self-check (Phase 12) |
| `npm run test:validate` | AI schema gate self-check (Phase 12) |
| `npm run test:bundle-secrets` | Build + scan `dist/` for forbidden Gemini/service-role secrets (CP-28) |

## Layout

Follows RR-DEP-011 §5 / RR-DEV-012: `src/app`, `modules/*`, `components/{ui,domain,layout}`, `lib`, `hooks`, `types`, `styles`.
