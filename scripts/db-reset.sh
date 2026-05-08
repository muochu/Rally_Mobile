#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! npx supabase status >/dev/null 2>&1; then
  echo "Starting local Supabase..."
  npx supabase start
fi

echo "Resetting local database, applying migrations, and seeding..."
npx supabase db reset --local

echo "Database reset complete."
