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
| `npm run test:errors` | ErrorObject mapping self-check (CP-05) |

## Layout

Follows RR-DEP-011 §5 / RR-DEV-012: `src/app`, `modules/*`, `components/{ui,domain,layout}`, `lib`, `hooks`, `types`, `styles`.
