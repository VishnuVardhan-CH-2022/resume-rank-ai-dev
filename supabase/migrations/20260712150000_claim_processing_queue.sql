-- ResumeRank AI — Phase 9 / RR-DEV-012 CP-18
-- Claim processing_queue with FOR UPDATE SKIP LOCKED (DDD §5.8 / DEP §9.1)

CREATE OR REPLACE FUNCTION public.claim_processing_queue(
  p_limit integer DEFAULT 1,
  p_lock_owner text DEFAULT 'worker',
  p_visibility_ms integer DEFAULT 90000
)
RETURNS SETOF public.processing_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := GREATEST(1, LEAST(COALESCE(p_limit, 1), 20));
  v_visibility interval := make_interval(secs => GREATEST(5, COALESCE(p_visibility_ms, 90000) / 1000.0));
BEGIN
  -- Reclaim expired locks (visibility timeout)
  UPDATE public.processing_queue q
  SET
    queue_status = 'pending',
    locked_at = NULL,
    lock_owner = NULL,
    available_at = now(),
    updated_at = now()
  WHERE q.queue_status = 'locked'
    AND q.locked_at IS NOT NULL
    AND q.locked_at < (now() - v_visibility);

  RETURN QUERY
  WITH picked AS (
    SELECT q.id
    FROM public.processing_queue q
    WHERE q.queue_status = 'pending'
      AND q.available_at <= now()
    ORDER BY q.available_at ASC, q.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  ),
  updated AS (
    UPDATE public.processing_queue q
    SET
      queue_status = 'locked',
      locked_at = now(),
      lock_owner = p_lock_owner,
      attempt_count = q.attempt_count + 1,
      available_at = now() + v_visibility,
      updated_at = now()
    FROM picked
    WHERE q.id = picked.id
    RETURNING q.*
  )
  SELECT * FROM updated;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_processing_queue(integer, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_processing_queue(integer, text, integer) TO service_role;

COMMENT ON FUNCTION public.claim_processing_queue IS
  'Phase 9 worker claim: pending → locked with SKIP LOCKED; reclaims expired locks.';

-- Extend visibility while processing a long Gemini call
CREATE OR REPLACE FUNCTION public.extend_processing_queue_lock(
  p_queue_id uuid,
  p_lock_owner text,
  p_visibility_ms integer DEFAULT 90000
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visibility interval := make_interval(secs => GREATEST(5, COALESCE(p_visibility_ms, 90000) / 1000.0));
  v_updated integer;
BEGIN
  UPDATE public.processing_queue
  SET
    available_at = now() + v_visibility,
    locked_at = now(),
    updated_at = now()
  WHERE id = p_queue_id
    AND queue_status = 'locked'
    AND lock_owner = p_lock_owner;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.extend_processing_queue_lock(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.extend_processing_queue_lock(uuid, text, integer) TO service_role;
