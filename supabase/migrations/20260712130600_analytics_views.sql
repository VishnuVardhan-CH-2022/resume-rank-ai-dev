-- ResumeRank AI — Phase 3 / RR-DEV-012 CP-08
-- Analytics views (RR-DB-005 §10.6; RR-API-006 §7.5 / §9)
-- security_invoker so underlying table RLS applies (owner-scoped).

-- ---------------------------------------------------------------------------
-- job_progress_summary — one row per job
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.job_progress_summary
WITH (security_invoker = true)
AS
SELECT
  j.id AS job_id,
  count(c.id)::integer AS total_candidates,
  count(c.id) FILTER (WHERE c.status = 'uploaded')::integer AS uploaded_count,
  count(c.id) FILTER (WHERE c.status = 'queued')::integer AS queued_count,
  count(c.id) FILTER (WHERE c.status = 'parsing')::integer AS parsing_count,
  count(c.id) FILTER (WHERE c.status = 'parsed')::integer AS parsed_count,
  count(c.id) FILTER (WHERE c.status = 'ai_processing')::integer AS ai_processing_count,
  count(c.id) FILTER (WHERE c.status = 'completed')::integer AS completed_count,
  count(c.id) FILTER (WHERE c.status = 'failed_parse')::integer AS failed_parse_count,
  count(c.id) FILTER (WHERE c.status = 'failed_ai')::integer AS failed_ai_count,
  count(c.id) FILTER (WHERE c.status = 'archived')::integer AS archived_count,
  (
    count(c.id) FILTER (WHERE c.status IN ('failed_parse', 'failed_ai'))
  )::integer AS failed_total,
  CASE
    WHEN count(c.id) = 0 THEN 0::numeric
    ELSE round(
      (
        count(c.id) FILTER (WHERE c.status = 'completed')::numeric
        / count(c.id)::numeric
      ) * 100,
      2
    )
  END AS percent_completed
FROM public.jobs j
LEFT JOIN public.candidates c ON c.job_id = j.id
GROUP BY j.id;

COMMENT ON VIEW public.job_progress_summary IS
  'ADS §9.2 / DDD §10.6 — per-job status counts, percent completed, failed totals';

-- ---------------------------------------------------------------------------
-- candidate_ranking — flat rows; order via lifecycle_sort + match_score
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.candidate_ranking
WITH (security_invoker = true)
AS
SELECT
  c.job_id,
  CASE
    WHEN c.status = 'completed' THEN
      row_number() OVER (
        PARTITION BY c.job_id, (c.status = 'completed')
        ORDER BY e.match_score DESC NULLS LAST, e.evaluated_at DESC, c.id
      )
    ELSE NULL
  END::integer AS rank,
  c.id AS candidate_id,
  cp.name,
  c.status,
  CASE WHEN c.status = 'completed' THEN e.match_score ELSE NULL END AS match_score,
  CASE WHEN c.status = 'completed' THEN e.summary ELSE NULL END AS summary,
  c.failure_code,
  c.failure_message,
  CASE c.status
    WHEN 'completed' THEN 0
    WHEN 'ai_processing' THEN 1
    WHEN 'parsing' THEN 2
    WHEN 'parsed' THEN 3
    WHEN 'queued' THEN 4
    WHEN 'uploaded' THEN 5
    WHEN 'failed_ai' THEN 6
    WHEN 'failed_parse' THEN 7
    WHEN 'archived' THEN 8
    ELSE 9
  END AS lifecycle_sort,
  c.updated_at,
  e.evaluated_at
FROM public.candidates c
LEFT JOIN public.candidate_profiles cp ON cp.candidate_id = c.id
LEFT JOIN public.evaluations e ON e.candidate_id = c.id;

COMMENT ON VIEW public.candidate_ranking IS
  'ADS §7.5 — completed first by match_score DESC; use order=lifecycle_sort.asc,match_score.desc.nullslast';

-- ---------------------------------------------------------------------------
-- score_distribution — buckets 0-20 … 81-100 (completed only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.score_distribution
WITH (security_invoker = true)
AS
WITH buckets AS (
  SELECT *
  FROM (
    VALUES
      ('0-20'::text, 0::numeric, 20::numeric),
      ('21-40', 21, 40),
      ('41-60', 41, 60),
      ('61-80', 61, 80),
      ('81-100', 81, 100)
  ) AS t (range, lo, hi)
),
job_ids AS (
  SELECT j.id AS job_id
  FROM public.jobs j
)
SELECT
  j.job_id,
  b.range,
  count(e.id)::integer AS count
FROM job_ids j
CROSS JOIN buckets b
LEFT JOIN public.candidates c
  ON c.job_id = j.job_id
 AND c.status = 'completed'
LEFT JOIN public.evaluations e
  ON e.candidate_id = c.id
 AND e.match_score IS NOT NULL
 AND e.match_score >= b.lo
 AND e.match_score <= b.hi
GROUP BY j.job_id, b.range, b.lo;

COMMENT ON VIEW public.score_distribution IS
  'ADS §9.4 / DDD §10.6 — completed-only histogram buckets';

-- ---------------------------------------------------------------------------
-- screening_statistics — throughput per job (ADS §9.3)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.screening_statistics
WITH (security_invoker = true)
AS
SELECT
  j.id AS job_id,
  count(c.id) FILTER (WHERE c.status = 'uploaded')::integer AS uploaded_count,
  count(c.id) FILTER (WHERE c.status = 'queued')::integer AS queued_count,
  count(c.id) FILTER (WHERE c.status = 'completed')::integer AS completed_count,
  count(c.id) FILTER (WHERE c.status = 'failed_parse')::integer AS failed_parse_count,
  count(c.id) FILTER (WHERE c.status = 'failed_ai')::integer AS failed_ai_count,
  avg(e.match_score) FILTER (WHERE c.status = 'completed') AS avg_match_score
FROM public.jobs j
LEFT JOIN public.candidates c ON c.job_id = j.id
LEFT JOIN public.evaluations e ON e.candidate_id = c.id
GROUP BY j.id;

COMMENT ON VIEW public.screening_statistics IS
  'ADS §9.3 — uploaded/queued/completed/failed_* counts and avg score';

-- ---------------------------------------------------------------------------
-- dashboard_metrics — one row per owner (ADS §9.1)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.dashboard_metrics
WITH (security_invoker = true)
AS
SELECT
  j.owner_user_id,
  count(DISTINCT j.id) FILTER (WHERE j.lifecycle_status = 'active')::integer AS active_jobs,
  count(c.id)::integer AS total_candidates,
  count(c.id) FILTER (WHERE c.status = 'completed')::integer AS completed_count,
  count(c.id) FILTER (
    WHERE c.status IN ('failed_parse', 'failed_ai')
  )::integer AS failed_count,
  avg(e.match_score) FILTER (WHERE c.status = 'completed') AS avg_match_score
FROM public.jobs j
LEFT JOIN public.candidates c ON c.job_id = j.id
LEFT JOIN public.evaluations e ON e.candidate_id = c.id
GROUP BY j.owner_user_id;

COMMENT ON VIEW public.dashboard_metrics IS
  'ADS §9.1 — owner homepage: active_jobs, totals, avg_match_score';
