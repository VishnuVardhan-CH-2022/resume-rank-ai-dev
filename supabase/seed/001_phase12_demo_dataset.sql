-- Phase 12 (CP-30) demo dataset for QA/manual verification.
-- Uses synthetic names only (no production PII).
-- Requires at least one existing profile row (created via Auth signup).
DO $$
DECLARE
  v_owner_a uuid;
  v_owner_b uuid;
  v_job_a constant uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  v_job_b constant uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
  v_candidate_completed constant uuid := '30000000-0000-4000-8000-000000000001';
  v_candidate_failed_ai constant uuid := '30000000-0000-4000-8000-000000000002';
  v_candidate_failed_parse constant uuid := '30000000-0000-4000-8000-000000000003';
  v_candidate_owner_b constant uuid := '40000000-0000-4000-8000-000000000001';
  v_fixture_candidate_id uuid;
  i integer;
BEGIN
  SELECT id
  INTO v_owner_a
  FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_owner_a IS NULL THEN
    RAISE NOTICE 'Phase 12 demo seed skipped: create at least one auth user first.';
    RETURN;
  END IF;

  SELECT id
  INTO v_owner_b
  FROM public.profiles
  WHERE id <> v_owner_a
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_owner_b IS NULL THEN
    v_owner_b := v_owner_a;
  END IF;

  -- Job A: primary demo job for upload/screen/ranking/analytics scenarios.
  INSERT INTO public.jobs (id, owner_user_id, title, jd_text, lifecycle_status)
  VALUES (
    v_job_a,
    v_owner_a,
    'Phase 12 QA — Backend Engineer',
    'Need TypeScript, SQL, API design, and async job processing experience.',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    title = EXCLUDED.title,
    jd_text = EXCLUDED.jd_text,
    lifecycle_status = 'active';

  -- Job B: secondary owner-scope/AuthZ fixture.
  INSERT INTO public.jobs (id, owner_user_id, title, jd_text, lifecycle_status)
  VALUES (
    v_job_b,
    v_owner_b,
    'Phase 12 QA — Data Analyst',
    'Need analytics interpretation and stakeholder reporting.',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    title = EXCLUDED.title,
    jd_text = EXCLUDED.jd_text,
    lifecycle_status = 'active';

  -- ≥20 uploaded candidates for NFR-010 batch coverage.
  FOR i IN 1..20 LOOP
    v_fixture_candidate_id :=
      ('10000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;

    INSERT INTO public.candidates (
      id,
      job_id,
      status,
      failure_code,
      failure_message,
      original_filename
    )
    VALUES (
      v_fixture_candidate_id,
      v_job_a,
      'uploaded',
      NULL,
      NULL,
      'fixture_' || lpad(i::text, 2, '0') || '.pdf'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      status = EXCLUDED.status,
      failure_code = NULL,
      failure_message = NULL,
      original_filename = EXCLUDED.original_filename;

    INSERT INTO public.resume_files (
      candidate_id,
      storage_bucket,
      storage_path,
      mime_type,
      size_bytes,
      checksum
    )
    VALUES (
      v_fixture_candidate_id,
      'resumes',
      'resumes/' || v_owner_a || '/' || v_job_a || '/' || v_fixture_candidate_id || '/fixture_' || lpad(i::text, 2, '0') || '.pdf',
      'application/pdf',
      24576,
      NULL
    )
    ON CONFLICT (candidate_id) DO UPDATE
    SET
      storage_bucket = EXCLUDED.storage_bucket,
      storage_path = EXCLUDED.storage_path,
      mime_type = EXCLUDED.mime_type,
      size_bytes = EXCLUDED.size_bytes,
      checksum = EXCLUDED.checksum;
  END LOOP;

  -- Additional lifecycle fixtures for ranking/retry/failure views.
  INSERT INTO public.candidates (
    id,
    job_id,
    status,
    failure_code,
    failure_message,
    original_filename
  )
  VALUES
    (v_candidate_completed, v_job_a, 'completed', NULL, NULL, 'completed_candidate.pdf'),
    (v_candidate_failed_ai, v_job_a, 'failed_ai', 'EH-AI', 'Synthetic AI failure for retry QA.', 'failed_ai_candidate.pdf'),
    (v_candidate_failed_parse, v_job_a, 'failed_parse', 'EH-PARSE', 'Synthetic parse failure for guidance QA.', 'failed_parse_candidate.pdf'),
    (v_candidate_owner_b, v_job_b, 'uploaded', NULL, NULL, 'owner_b_candidate.pdf')
  ON CONFLICT (id) DO UPDATE
  SET
    status = EXCLUDED.status,
    failure_code = EXCLUDED.failure_code,
    failure_message = EXCLUDED.failure_message,
    original_filename = EXCLUDED.original_filename;

  INSERT INTO public.resume_files (
    candidate_id,
    storage_bucket,
    storage_path,
    mime_type,
    size_bytes,
    checksum
  )
  VALUES
    (
      v_candidate_completed,
      'resumes',
      'resumes/' || v_owner_a || '/' || v_job_a || '/' || v_candidate_completed || '/completed_candidate.pdf',
      'application/pdf',
      28144,
      NULL
    ),
    (
      v_candidate_failed_ai,
      'resumes',
      'resumes/' || v_owner_a || '/' || v_job_a || '/' || v_candidate_failed_ai || '/failed_ai_candidate.pdf',
      'application/pdf',
      28144,
      NULL
    ),
    (
      v_candidate_failed_parse,
      'resumes',
      'resumes/' || v_owner_a || '/' || v_job_a || '/' || v_candidate_failed_parse || '/failed_parse_candidate.pdf',
      'application/pdf',
      28144,
      NULL
    ),
    (
      v_candidate_owner_b,
      'resumes',
      'resumes/' || v_owner_b || '/' || v_job_b || '/' || v_candidate_owner_b || '/owner_b_candidate.pdf',
      'application/pdf',
      28144,
      NULL
    )
  ON CONFLICT (candidate_id) DO UPDATE
  SET
    storage_bucket = EXCLUDED.storage_bucket,
    storage_path = EXCLUDED.storage_path,
    mime_type = EXCLUDED.mime_type,
    size_bytes = EXCLUDED.size_bytes,
    checksum = EXCLUDED.checksum;

  -- Completed fixture profile + active evaluation.
  INSERT INTO public.candidate_profiles (
    candidate_id,
    name,
    email,
    phone,
    skills,
    education,
    experience,
    certifications,
    projects,
    resume_summary,
    linkedin,
    github,
    portfolio,
    languages,
    location
  )
  VALUES (
    v_candidate_completed,
    'Jordan Lee',
    'jordan.lee@example.test',
    '+1-555-0101',
    '["TypeScript","PostgreSQL","React"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '["AWS Certified Cloud Practitioner"]'::jsonb,
    '[]'::jsonb,
    'Synthetic candidate profile for ranking and detail verification.',
    'https://linkedin.example.test/jordanlee',
    'https://github.example.test/jordanlee',
    'https://portfolio.example.test/jordanlee',
    '["English"]'::jsonb,
    'Remote'
  )
  ON CONFLICT (candidate_id) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    skills = EXCLUDED.skills,
    education = EXCLUDED.education,
    experience = EXCLUDED.experience,
    certifications = EXCLUDED.certifications,
    projects = EXCLUDED.projects,
    resume_summary = EXCLUDED.resume_summary,
    linkedin = EXCLUDED.linkedin,
    github = EXCLUDED.github,
    portfolio = EXCLUDED.portfolio,
    languages = EXCLUDED.languages,
    location = EXCLUDED.location;

  INSERT INTO public.evaluations (
    candidate_id,
    job_id,
    match_score,
    rationale,
    summary,
    model_metadata
  )
  VALUES (
    v_candidate_completed,
    v_job_a,
    87.5,
    'Strong alignment in API design, TypeScript, and async workflow delivery.',
    'Good fit for backend engineer role.',
    jsonb_build_object(
      'provider', 'gemini',
      'model', 'gemini-2.0-flash',
      'prompt_version', 'rr-ai-prompt-1.0.0',
      'schema_version', 'rr-ai-response-1.0.0'
    )
  )
  ON CONFLICT (candidate_id) DO UPDATE
  SET
    job_id = EXCLUDED.job_id,
    match_score = EXCLUDED.match_score,
    rationale = EXCLUDED.rationale,
    summary = EXCLUDED.summary,
    model_metadata = EXCLUDED.model_metadata,
    evaluated_at = now();

  -- Helpful trace for manual QA logs (no raw resume text).
  INSERT INTO public.audit_logs (actor_user_id, job_id, candidate_id, event_type, payload)
  VALUES (
    v_owner_a,
    v_job_a,
    NULL,
    'phase12_seed',
    jsonb_build_object(
      'fixture_batch_candidates', 20,
      'owner_scope_mode', CASE WHEN v_owner_b = v_owner_a THEN 'single_owner' ELSE 'dual_owner' END
    )
  );
END $$;
