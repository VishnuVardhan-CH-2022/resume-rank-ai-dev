-- ResumeRank AI — Phase 3 / RR-DEV-012 CP-06
-- Core tables, CHECKs, FKs (RR-DB-005 v1.1; RR-DEP-011 §8.1 steps 2–4)
-- Authoritative candidate statuses — NOT SRS coarse pending/processing.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  title text NOT NULL,
  jd_text text NOT NULL,
  lifecycle_status text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jobs_title_nonempty CHECK (char_length(btrim(title)) > 0),
  CONSTRAINT jobs_jd_nonempty CHECK (char_length(btrim(jd_text)) > 0)
);

CREATE TRIGGER jobs_set_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- candidates (authoritative status set — DDD §4.4.1)
-- ---------------------------------------------------------------------------
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN (
      'uploaded',
      'queued',
      'parsing',
      'parsed',
      'ai_processing',
      'completed',
      'failed_parse',
      'failed_ai',
      'archived'
    )),
  failure_code text,
  failure_message text,
  original_filename text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER candidates_set_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- job_id immutable after insert (DDD §5.3)
CREATE OR REPLACE FUNCTION public.enforce_candidate_job_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.job_id IS DISTINCT FROM OLD.job_id THEN
    RAISE EXCEPTION 'candidates.job_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER candidates_job_immutable
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_candidate_job_immutable();

-- ---------------------------------------------------------------------------
-- resume_files (1:1 with candidate in v1)
-- ---------------------------------------------------------------------------
CREATE TABLE public.resume_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL UNIQUE REFERENCES public.candidates (id) ON DELETE CASCADE,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  checksum text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resume_files_storage_path_unique UNIQUE (storage_path)
);

-- ---------------------------------------------------------------------------
-- candidate_profiles (CE-01 … CE-14)
-- ---------------------------------------------------------------------------
CREATE TABLE public.candidate_profiles (
  candidate_id uuid PRIMARY KEY REFERENCES public.candidates (id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  skills jsonb,
  education jsonb,
  experience jsonb,
  certifications jsonb,
  projects jsonb,
  resume_summary text,
  linkedin text,
  github text,
  portfolio text,
  languages jsonb,
  location text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER candidate_profiles_set_updated_at
  BEFORE UPDATE ON public.candidate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- evaluations (one active row per candidate — UNIQUE candidate_id)
-- ---------------------------------------------------------------------------
CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL UNIQUE REFERENCES public.candidates (id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs (id) ON DELETE RESTRICT,
  match_score numeric
    CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100)),
  rationale text,
  summary text,
  model_metadata jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.enforce_evaluation_job_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  SELECT c.job_id INTO v_job_id
  FROM public.candidates c
  WHERE c.id = NEW.candidate_id;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'evaluations.candidate_id not found';
  END IF;

  IF NEW.job_id IS DISTINCT FROM v_job_id THEN
    RAISE EXCEPTION 'evaluations.job_id must equal candidates.job_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER evaluations_job_match
  BEFORE INSERT OR UPDATE ON public.evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_evaluation_job_match();

-- ---------------------------------------------------------------------------
-- evaluation_history (append-only snapshots)
-- ---------------------------------------------------------------------------
CREATE TABLE public.evaluation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates (id) ON DELETE RESTRICT,
  job_id uuid NOT NULL REFERENCES public.jobs (id) ON DELETE RESTRICT,
  match_score numeric
    CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100)),
  rationale text,
  summary text,
  model_metadata jsonb,
  evaluated_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- processing_queue (at most one open row per candidate)
-- ---------------------------------------------------------------------------
CREATE TABLE public.processing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates (id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs (id) ON DELETE RESTRICT,
  queue_status text NOT NULL DEFAULT 'pending'
    CHECK (queue_status IN ('pending', 'locked', 'done', 'dead')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  lock_owner text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER processing_queue_set_updated_at
  BEFORE UPDATE ON public.processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- One open queue entry: pending|locked (DDD §4.9 / §9.1)
CREATE UNIQUE INDEX processing_queue_one_open_per_candidate
  ON public.processing_queue (candidate_id)
  WHERE queue_status IN ('pending', 'locked');

-- ---------------------------------------------------------------------------
-- audit_logs (non-PII payload only — enforced in app/RPS)
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs (id) ON DELETE SET NULL,
  candidate_id uuid REFERENCES public.candidates (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- jobs.owner_user_id immutability
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_job_owner_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    RAISE EXCEPTION 'jobs.owner_user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER jobs_owner_immutable
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_job_owner_immutable();
