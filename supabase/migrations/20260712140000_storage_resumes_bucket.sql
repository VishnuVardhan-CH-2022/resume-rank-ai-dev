-- ResumeRank AI — Phase 5 / RR-DEV-012 CP-14
-- Private resumes bucket + owner-prefix Storage RLS (RR-DEP-011 §11; RR-SEC-009 §6)

-- ---------------------------------------------------------------------------
-- Bucket: private, 5 MB, PDF/DOCX only
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'resumes',
  'resumes',
  false,
  5242880,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Policies: owner folder = first path segment (auth.uid())
-- Object key shape: {owner_id}/{job_id}/{candidate_id}/{filename}
-- Logical DDD path: resumes/{owner_id}/{job_id}/{candidate_id}/{filename}
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS resumes_select_own ON storage.objects;
DROP POLICY IF EXISTS resumes_insert_own ON storage.objects;
DROP POLICY IF EXISTS resumes_update_own ON storage.objects;
DROP POLICY IF EXISTS resumes_delete_own ON storage.objects;

CREATE POLICY resumes_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY resumes_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY resumes_update_own
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY resumes_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Anonymous: no policies → deny list/read/write (DEP §11 / SEC §6.1)

COMMENT ON TABLE storage.buckets IS
  'ResumeRank: resumes bucket is private; owner-scoped object keys only.';
