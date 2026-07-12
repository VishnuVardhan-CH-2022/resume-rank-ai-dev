# ResumeRank AI — Web SPA

React + TypeScript + Vite + Tailwind CSS + shadcn/ui.

## Setup

```bash
cd apps/web
npm install
npm run dev
```

Copy root [`.env.example`](../../.env.example) values into a local `.env` when starting Phase 2 (Supabase). Only `VITE_*` keys belong in the Vite client.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Vite server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Oxlint |

## Layout

Follows RR-DEP-011 §5 / RR-DEV-012: `src/app`, `modules/*`, `components/{ui,domain,layout}`, `lib`, `hooks`, `types`, `styles`.
