#!/usr/bin/env bash
# Setup script for Pincite on Claude Code for the web.
# Runs once after the repo is cloned, before Claude starts. The result is cached,
# so it only re-runs when the environment cache is invalidated.
# Keep total runtime under ~5 minutes or the session will time out.
#
# Point your cloud environment's "Setup script" field at this file:
#     bash scripts/web-setup.sh
set -euo pipefail

echo "[pincite] web setup starting"

# --- Node dependencies -------------------------------------------------------
# Pincite is a Next.js app. The repo may not be scaffolded yet, so guard on
# package.json to avoid failing the session before there is anything to install.
if [ -f package.json ]; then
  if [ -f package-lock.json ]; then
    echo "[pincite] installing with npm ci"
    npm ci
  elif [ -f pnpm-lock.yaml ]; then
    echo "[pincite] installing with pnpm"
    corepack enable || true
    pnpm install --frozen-lockfile
  elif [ -f yarn.lock ]; then
    echo "[pincite] installing with yarn"
    corepack enable || true
    yarn install --frozen-lockfile
  else
    echo "[pincite] no lockfile found, running npm install"
    npm install
  fi
else
  echo "[pincite] no package.json yet, skipping dependency install"
fi

# --- Env var sanity check (non-fatal) ---------------------------------------
# Warns if expected variables are missing. Never prints values. Never blocks the
# session. Set the real values in the environment's "Environment variables" field.
required_vars=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  XAI_API_KEY
  GEMINI_API_KEY
  VOYAGE_API_KEY
  USPTO_API_KEY
)
missing=()
for v in "${required_vars[@]}"; do
  if [ -z "${!v:-}" ]; then
    missing+=("$v")
  fi
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "[pincite] warning: missing env vars: ${missing[*]}"
  echo "[pincite] add them in the cloud environment's Environment variables field"
fi

echo "[pincite] web setup done"
