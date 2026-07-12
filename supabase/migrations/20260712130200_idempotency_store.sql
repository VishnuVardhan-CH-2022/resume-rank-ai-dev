-- ResumeRank AI — Phase 3 / RR-DEV-012 CP-06
-- Idempotency store for screen/retry (ADS §8.8; DEP §8.1)
-- Not a DDD entity table; minimum columns from replay contract.

CREATE TABLE public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  route text NOT NULL
    CHECK (route IN ('screen', 'retry')),
  request_body_hash text NOT NULL,
  response_status integer NOT NULL DEFAULT 202,
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT idempotency_keys_user_key_unique UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idempotency_keys_created_at_idx
  ON public.idempotency_keys (created_at);

COMMENT ON TABLE public.idempotency_keys IS
  'ADS §8.8: replay original 202 for same key+body; 409 on body mismatch; TTL ~24h (app purge).';
