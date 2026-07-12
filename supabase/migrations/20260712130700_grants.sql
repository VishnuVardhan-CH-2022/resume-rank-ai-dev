-- ResumeRank AI — Phase 3 / RR-DEP-011 §8.1 step 8
-- Privileges for PostgREST roles (RLS still enforces row scope)

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, INSERT ON public.candidates TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.resume_files TO authenticated;
GRANT SELECT ON public.candidate_profiles TO authenticated;
GRANT SELECT ON public.evaluations TO authenticated;
GRANT SELECT ON public.evaluation_history TO authenticated;
GRANT SELECT ON public.processing_queue TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

GRANT SELECT ON public.job_progress_summary TO authenticated;
GRANT SELECT ON public.candidate_ranking TO authenticated;
GRANT SELECT ON public.score_distribution TO authenticated;
GRANT SELECT ON public.screening_statistics TO authenticated;
GRANT SELECT ON public.dashboard_metrics TO authenticated;

-- service_role: full access for RPS / Edge (bypasses RLS)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Future tables default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
