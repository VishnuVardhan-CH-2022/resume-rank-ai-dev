#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

require_cmd node
require_cmd npm
require_cmd bash

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node 20+ is required for Phase 13 deployment preflight." >&2
  exit 1
fi

echo "Phase 13 preflight: running lint/build/tests in apps/web"
cd "$WEB_DIR"

if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  npm ci
fi

npm run lint
npm run build
npm test

echo "Phase 13 preflight complete."
