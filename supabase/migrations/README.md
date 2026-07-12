# Phase 3 — Database migrations

SQL under `migrations/` implements **RR-DB-005 v1.1**, **RR-SEC-009 §5**, **RR-API-006 §7.5/§9**, and **RR-DEV-012** CP-06–CP-08.

## Apply (linked remote)

```bash
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase db push
```

## Apply (local Docker)

```bash
npx supabase start
npx supabase db reset   # applies all migrations + seed
```

## Migration order

| File | Purpose |
| --- | --- |
| `20260712130000_extensions_helpers.sql` | pgcrypto, `set_updated_at` |
| `20260712130100_core_tables.sql` | DDD tables + CHECKs + FKs + one-open queue unique |
| `20260712130150_ownership_helpers.sql` | `is_job_owner` / `is_candidate_owner` |
| `20260712130200_idempotency_store.sql` | ADS §8.8 screen/retry keys |
| `20260712130300_indexes.sql` | Owner/job/queue indexes |
| `20260712130400_profiles_trigger.sql` | `auth.users` → `profiles` |
| `20260712130500_rls_policies.sql` | Owner RLS; SPA cannot write evals / claim queue |
| `20260712130600_analytics_views.sql` | Five analytics views (`security_invoker`) |
| `20260712130700_grants.sql` | Role privileges |
| `20260712140000_storage_resumes_bucket.sql` | Private `resumes` bucket + owner Storage RLS (Phase 5) |

## Authoritative candidate statuses

`uploaded` → `queued` → `parsing` → `parsed` → `ai_processing` → `completed`  
Terminal failures: `failed_parse`, `failed_ai` · Soft: `archived`  

Do **not** use SRS coarse `pending` / `processing` as DB values.

## Post-apply checks

1. Tables exist in Table Editor  
2. RLS enabled on all app tables  
3. Duplicate `evaluations.candidate_id` insert fails  
4. Second open `processing_queue` row for same candidate fails  
5. User B cannot `SELECT` User A jobs  
6. Views: `candidate_ranking`, `job_progress_summary`, `score_distribution`, `screening_statistics`, `dashboard_metrics`
7. Storage: bucket `resumes` is **private**; anon list denied; object key `{owner}/{job}/{candidate}/{file}`

## Ranking client order

```
GET /rest/v1/candidate_ranking?job_id=eq.{id}&order=lifecycle_sort.asc,match_score.desc.nullslast,evaluated_at.desc.nullslast,candidate_id.asc
```
