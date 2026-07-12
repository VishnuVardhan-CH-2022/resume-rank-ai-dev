-- ResumeRank AI — Phase 3
-- Ownership helpers (after tables exist — SQL functions bind relations at create time)

CREATE OR REPLACE FUNCTION public.is_job_owner(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = p_job_id
      AND j.owner_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_candidate_owner(p_candidate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.candidates c
    JOIN public.jobs j ON j.id = c.job_id
    WHERE c.id = p_candidate_id
      AND j.owner_user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_job_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_candidate_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_job_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_candidate_owner(uuid) TO authenticated, service_role;
