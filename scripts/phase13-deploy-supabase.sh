#!/usr/bin/env bash
set -euo pipefail

# Manual Phase 13 Supabase deploy helper.
# Applies DB + secrets + function deployments in RR-DEP-011 release order.

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing required env: $name" >&2
    exit 1
  fi
}

run_cmd() {
  echo "+ $*"
  "$@"
}

require_cmd supabase

require_env SUPABASE_PROJECT_REF
require_env SUPABASE_URL
require_env SUPABASE_SERVICE_ROLE_KEY
require_env GEMINI_API_KEY
require_env GEMINI_MODEL

UPLOAD_MAX_BYTES="${UPLOAD_MAX_BYTES:-5242880}"
AI_MAX_TRANSIENT_RETRIES="${AI_MAX_TRANSIENT_RETRIES:-2}"
AI_CALL_TIMEOUT_MS="${AI_CALL_TIMEOUT_MS:-60000}"
QUEUE_VISIBILITY_TIMEOUT_MS="${QUEUE_VISIBILITY_TIMEOUT_MS:-90000}"
GEMINI_CONCURRENCY="${GEMINI_CONCURRENCY:-3}"
SIGNED_URL_EXPIRES_IN="${SIGNED_URL_EXPIRES_IN:-300}"
IDEMPOTENCY_TTL_HOURS="${IDEMPOTENCY_TTL_HOURS:-24}"

echo "Phase 13 Supabase deploy starting for project ref: $SUPABASE_PROJECT_REF"
echo "Step 1/4: link project"
run_cmd supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "Step 2/4: apply migrations"
run_cmd supabase db push

echo "Step 3/4: set Edge secrets"
supabase secrets set \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  GEMINI_API_KEY="$GEMINI_API_KEY" \
  GEMINI_MODEL="$GEMINI_MODEL" \
  UPLOAD_MAX_BYTES="$UPLOAD_MAX_BYTES" \
  AI_MAX_TRANSIENT_RETRIES="$AI_MAX_TRANSIENT_RETRIES" \
  AI_CALL_TIMEOUT_MS="$AI_CALL_TIMEOUT_MS" \
  QUEUE_VISIBILITY_TIMEOUT_MS="$QUEUE_VISIBILITY_TIMEOUT_MS" \
  GEMINI_CONCURRENCY="$GEMINI_CONCURRENCY" \
  SIGNED_URL_EXPIRES_IN="$SIGNED_URL_EXPIRES_IN" \
  IDEMPOTENCY_TTL_HOURS="$IDEMPOTENCY_TTL_HOURS" \
  --project-ref "$SUPABASE_PROJECT_REF"

echo "Step 4/4: deploy Edge functions"
run_cmd supabase functions deploy screen-job --project-ref "$SUPABASE_PROJECT_REF"
run_cmd supabase functions deploy retry-candidate --project-ref "$SUPABASE_PROJECT_REF"
run_cmd supabase functions deploy resume-url --project-ref "$SUPABASE_PROJECT_REF"
run_cmd supabase functions deploy process-queue --project-ref "$SUPABASE_PROJECT_REF"

echo
echo "Supabase deployment complete."
echo "Next manual steps:"
echo "  1) Configure Vercel root=apps/web with only VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY"
echo "  2) Deploy preview/prod SPA"
echo "  3) Execute AC-G01..AC-G10 smoke report"
