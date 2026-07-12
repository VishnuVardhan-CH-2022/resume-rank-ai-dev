-- ResumeRank AI — Phase 3 / RR-DEV-012 CP-07
-- RLS policies (RR-SEC-009 §5; owner via jobs.owner_user_id = auth.uid())
-- SPA must NOT write evaluations, claim queue, or write idempotency/history/profiles CE.

-- Enable RLS on all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- profiles: self only
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select_self
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_self
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT via Auth trigger (security definer); no direct SPA insert policy

-- ---------------------------------------------------------------------------
-- jobs: owner CRUD; delete only when empty
-- ---------------------------------------------------------------------------
CREATE POLICY jobs_select_owner
  ON public.jobs FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY jobs_insert_owner
  ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY jobs_update_owner
  ON public.jobs FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY jobs_delete_owner_empty
  ON public.jobs FOR DELETE TO authenticated
  USING (
    owner_user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.candidates c WHERE c.job_id = jobs.id
    )
  );

-- ---------------------------------------------------------------------------
-- candidates: owner read; insert on owned active job; no SPA status updates
-- ---------------------------------------------------------------------------
CREATE POLICY candidates_select_owner
  ON public.candidates FOR SELECT TO authenticated
  USING (public.is_job_owner(job_id));

CREATE POLICY candidates_insert_owner_active_job
  ON public.candidates FOR INSERT TO authenticated
  WITH CHECK (
    public.is_job_owner(job_id)
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id
        AND j.owner_user_id = auth.uid()
        AND j.lifecycle_status = 'active'
    )
    AND status = 'uploaded'
  );

-- No UPDATE/DELETE policies for authenticated → SPA cannot mutate status
-- (RPS uses service_role which bypasses RLS)

-- ---------------------------------------------------------------------------
-- resume_files: owner read/insert/delete (upload + compensation)
-- ---------------------------------------------------------------------------
CREATE POLICY resume_files_select_owner
  ON public.resume_files FOR SELECT TO authenticated
  USING (public.is_candidate_owner(candidate_id));

CREATE POLICY resume_files_insert_owner
  ON public.resume_files FOR INSERT TO authenticated
  WITH CHECK (public.is_candidate_owner(candidate_id));

CREATE POLICY resume_files_delete_owner
  ON public.resume_files FOR DELETE TO authenticated
  USING (public.is_candidate_owner(candidate_id));

-- ---------------------------------------------------------------------------
-- candidate_profiles: owner read only (RPS upserts via service_role)
-- ---------------------------------------------------------------------------
CREATE POLICY candidate_profiles_select_owner
  ON public.candidate_profiles FOR SELECT TO authenticated
  USING (public.is_candidate_owner(candidate_id));

-- ---------------------------------------------------------------------------
-- evaluations: owner read only (RPS writes via service_role)
-- ---------------------------------------------------------------------------
CREATE POLICY evaluations_select_owner
  ON public.evaluations FOR SELECT TO authenticated
  USING (public.is_candidate_owner(candidate_id));

-- ---------------------------------------------------------------------------
-- evaluation_history: owner read only (RPS append via service_role)
-- ---------------------------------------------------------------------------
CREATE POLICY evaluation_history_select_owner
  ON public.evaluation_history FOR SELECT TO authenticated
  USING (public.is_candidate_owner(candidate_id));

-- ---------------------------------------------------------------------------
-- processing_queue: optional owner read; NO insert/update for SPA (no claim)
-- ---------------------------------------------------------------------------
CREATE POLICY processing_queue_select_owner
  ON public.processing_queue FOR SELECT TO authenticated
  USING (public.is_job_owner(job_id));

-- ---------------------------------------------------------------------------
-- audit_logs: owner-scoped read; no SPA writes
-- ---------------------------------------------------------------------------
CREATE POLICY audit_logs_select_owner
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    actor_user_id = auth.uid()
    OR (job_id IS NOT NULL AND public.is_job_owner(job_id))
    OR (candidate_id IS NOT NULL AND public.is_candidate_owner(candidate_id))
  );

-- ---------------------------------------------------------------------------
-- idempotency_keys: no authenticated access (Edge/service_role only)
-- ---------------------------------------------------------------------------
-- Intentionally no policies for authenticated → deny all for SPA
