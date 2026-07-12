-- ResumeRank AI — Phase 3 / RR-DEV-012 CP-06
-- Extensions and shared helpers (RR-DEP-011 §8.1 step 1)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Touch updated_at on row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
