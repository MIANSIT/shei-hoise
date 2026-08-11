#!/bin/sh
# Dumps the ENTIRE local prod Postgres (all schemas: public, auth, storage,
# extensions — not just --schema=public like migrate-public-data.sh) so it
# can be restored as-is onto a fresh VPS Postgres. This is a straight clone
# of an already-correct database, not a re-run of the Cloud migration:
# local prod already has every fix applied (auth ids, image URLs, the
# public.users id resync), and the VPS should end up bit-for-bit the same.
#
# Because the dump includes GoTrue's own auth.schema_migrations tracking
# table, restoring it onto an EMPTY VPS Postgres data directory BEFORE
# starting auth/storage means those containers see their expected schema
# already in place on boot and just start — no self-migration conflicts,
# since both sides run the identical supabase/postgres:17.6.1.136 image.
#
# Usage: docker/scripts/migrate-data/dump-local-prod-db.sh
# Output: docker/full-prod.dump (gitignored) — scp this to the VPS, then:
#   docker exec -i <vps-db-container> pg_restore -U postgres -d postgres < full-prod.dump
# ONLY after starting `db` alone on the VPS with an empty data directory —
# see docker/VPS_DEPLOYMENT.md for the full ordered sequence.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$DOCKER_DIR/.." && pwd)"

OUT_FILE="$DOCKER_DIR/full-prod.dump"
CONTAINER_PATH="/tmp/full-prod.dump"

echo "Dumping the full local prod database (all schemas)..."
docker exec shei-hoise-db \
  pg_dump -U postgres -d postgres \
    --format=custom \
    --file="$CONTAINER_PATH"

docker cp "shei-hoise-db:$CONTAINER_PATH" "$OUT_FILE"
docker exec shei-hoise-db rm -f "$CONTAINER_PATH"

echo ""
echo "Dump written to: $OUT_FILE"
echo "Next: scp it to the VPS, then follow docker/VPS_DEPLOYMENT.md's restore step."
echo "(cd \"$REPO_ROOT\" for repo-root-relative paths if scripting the scp yourself.)"
