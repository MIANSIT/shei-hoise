#!/bin/sh
# Applies the repo's schema to the Postgres container: schema.sql (the current
# baseline snapshot) first, then supabase/migrations/*.sql on top via the
# Supabase CLI. Works against local Docker or (via --db-url + an SSH tunnel)
# the VPS Postgres later.
#
# Why both: supabase/migrations does NOT reconstruct the schema from scratch —
# core tables (e.g. store_settings) were introduced through a manual project
# migration, not a tracked CLI migration, and only live in schema.sql. Every
# migration in supabase/migrations is written idempotently (IF NOT EXISTS /
# IF EXISTS throughout — verified, no bare CREATE TABLE/ADD COLUMN/DROP without
# a guard), so replaying all of them on top of schema.sql is safe: migrations
# already reflected in schema.sql's July 9 snapshot no-op, and everything after
# that date applies for real.
#
# Usage: apply-migrations.sh [dev|prod]  (default: dev)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$DOCKER_DIR/.." && pwd)"

. "$SCRIPT_DIR/lib-env.sh" "$1"
echo "Target: $ENV_NAME ($ENV_FILE)"

set -a
. "$ENV_FILE"
set +a

if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: supabase CLI not found. Install it first (https://supabase.com/docs/guides/cli)." >&2
  exit 1
fi

# Both dev and prod containers are named shei-hoise-db (only one stack runs
# at a time — see docker/README.md), so this needs no per-environment change.
DB_URL="postgresql://postgres:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/${POSTGRES_DB}"
# The Supabase CLI's Postgres driver defaults to attempting SSL and hard-fails
# ("server refused TLS connection") against this plain-TCP local Postgres —
# putting sslmode=disable in the URL query string is silently ignored by the
# CLI; PGSSLMODE is the one that actually works.
export PGSSLMODE=disable

echo "Step A: loading schema.sql baseline into the db container..."
# schema.sql contains a handful of bare CREATE POLICY statements (no IF NOT
# EXISTS equivalent in Postgres), so it's only safe to load once — check
# whether the baseline is already there before re-running it.
already_loaded=$(docker exec -i shei-hoise-db psql -tA -U postgres -d "${POSTGRES_DB}" \
  -c "SELECT to_regclass('public.store_settings') IS NOT NULL")
if [ "$already_loaded" = "t" ]; then
  echo "Baseline already loaded, skipping."
else
  docker exec -i shei-hoise-db psql -v ON_ERROR_STOP=1 -U postgres -d "${POSTGRES_DB}" < "$REPO_ROOT/schema.sql"
  echo "Baseline loaded."
fi

# The Supabase CLI unconditionally tries to parse .env.local in the project
# directory (for env() interpolation in migrations/seeds) and this repo's
# .env.local has plain-text comment lines without a leading '#', which the
# CLI's stricter .env parser rejects. Move it aside for the duration of the
# CLI call only.
ENV_LOCAL="$REPO_ROOT/.env.local"
MOVED_ENV_LOCAL=false
if [ -f "$ENV_LOCAL" ]; then
  mv "$ENV_LOCAL" "$ENV_LOCAL.bak-migrate"
  MOVED_ENV_LOCAL=true
fi
restore_env_local() {
  if [ "$MOVED_ENV_LOCAL" = "true" ]; then
    mv "$ENV_LOCAL.bak-migrate" "$ENV_LOCAL"
  fi
}
trap restore_env_local EXIT

cd "$REPO_ROOT"

# Two migrations are already fully reflected in schema.sql's snapshot but
# aren't safely re-runnable (verified empirically, not guessed): one does a
# bare ALTER TABLE ... RENAME (errors "already exists" on replay), the other
# backfills from `orders` columns that its own DROP COLUMN already removed by
# the time schema.sql was captured (errors "does not exist" on replay).
# Every other migration in the folder uses IF NOT EXISTS/IF EXISTS guards
# throughout and is safe to actually re-run — replaying is what lets anything
# added after schema.sql's July 9 snapshot take real effect. Marking these two
# as applied (bookkeeping only, no SQL executed) is idempotent — safe to re-run
# this script against the same database.
echo "Step B: marking pre-schema.sql-snapshot migrations as applied (bookkeeping only)..."
supabase migration repair --status applied 20260707120000 20260707160000 --db-url "$DB_URL"

echo "Step C: applying remaining supabase/migrations for real..."
supabase migration up --db-url "$DB_URL" --include-all

echo "Migrations applied."
