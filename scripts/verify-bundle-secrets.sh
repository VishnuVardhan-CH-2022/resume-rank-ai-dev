#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"

cd "$WEB_DIR"
npm run build >/dev/null

echo "Scanning dist bundle for forbidden secret markers..."
if rg -n -i 'GEMINI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|GEMINI_MODEL' dist/; then
  echo "Bundle scan failed: forbidden secret marker found."
  exit 1
fi

echo "Bundle scan passed: no Gemini/service-role secrets found."
