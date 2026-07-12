-- ResumeRank AI — Phase 3 / RR-DEV-012 CP-06
-- Indexes (RR-DB-005 §5 / §10.2; RR-DEP-011 §8.1 step 5)

CREATE INDEX jobs_owner_lifecycle_created_idx
  ON public.jobs (owner_user_id, lifecycle_status, created_at DESC);

CREATE INDEX candidates_job_status_idx
  ON public.candidates (job_id, status);

CREATE INDEX candidates_job_created_idx
  ON public.candidates (job_id, created_at);

CREATE INDEX evaluation_history_candidate_archived_idx
  ON public.evaluation_history (candidate_id, archived_at DESC);

CREATE INDEX processing_queue_claim_idx
  ON public.processing_queue (queue_status, available_at);

CREATE INDEX processing_queue_candidate_idx
  ON public.processing_queue (candidate_id);

CREATE INDEX audit_logs_job_created_idx
  ON public.audit_logs (job_id, created_at DESC);

CREATE INDEX audit_logs_actor_created_idx
  ON public.audit_logs (actor_user_id, created_at DESC);
