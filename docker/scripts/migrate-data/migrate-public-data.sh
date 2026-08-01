#!/bin/sh
# Copies every public-schema table's row data (stores, products, orders,
# customers, dashboard summaries, everything) from the live Supabase Cloud
# project into the self-hosted Postgres container. DATA ONLY — the schema
# must already be bootstrapped first (run apply-migrations.sh).
#
# auth.users is deliberately NOT copied here — migrate-auth.mjs handles auth
# migration separately via the GoTrue Admin API. A raw SQL copy of auth.users
# would carry over bcrypt password hashes in a way that isn't portable across
# different GoTrue instances/versions, which is exactly the problem
# migrate-auth.mjs already solves (at the cost of forcing a password reset).
#
# Runs pg_dump/pg_restore INSIDE the shei-hoise-db container (it already has
# matching client tools) rather than requiring them installed on the host.
#
# Usage:
#   SOURCE_DB_URL='postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres' \
#   docker/scripts/migrate-data/migrate-public-data.sh [dev|prod]
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

. "$DOCKER_DIR/scripts/lib-env.sh" "$1"
echo "Target: $ENV_NAME ($ENV_FILE)"

set -a
. "$ENV_FILE"
set +a

if [ -z "$SOURCE_DB_URL" ]; then
  echo "Error: SOURCE_DB_URL is not set. Example:" >&2
  echo "  SOURCE_DB_URL='postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres' $0 $ENV_NAME" >&2
  exit 1
fi

DUMP_PATH="/tmp/shei-hoise-public-data.dump"

echo "Step 1/2: dumping public-schema data from the source project..."
docker exec shei-hoise-db \
  pg_dump "$SOURCE_DB_URL" \
    --data-only \
    --schema=public \
    --no-owner \
    --no-privileges \
    --disable-triggers \
    --format=custom \
    --file="$DUMP_PATH"
echo "Dump complete."

echo "Step 2/2: restoring into the self-hosted database..."
# --disable-triggers issues ALTER TABLE ... DISABLE TRIGGER ALL, which touches
# internal RI (foreign-key) triggers — only a real superuser can do that.
# Despite the name, "postgres" is NOT superuser in Supabase's Postgres image
# (mirrors Supabase Cloud's role model); "supabase_admin" is the actual one.
docker exec shei-hoise-db \
  pg_restore \
    --data-only \
    --no-owner \
    --no-privileges \
    --disable-triggers \
    --single-transaction \
    -U supabase_admin \
    -d "${POSTGRES_DB}" \
    "$DUMP_PATH"
echo "Restore complete."

docker exec shei-hoise-db rm -f "$DUMP_PATH"

echo ""
echo "Public schema data migrated. Remaining steps (see docker/README.md):"
echo "  1. migrate-auth.mjs          — migrate auth users via the Admin API"
echo "  2. fix-auth-id-references.mjs — repoint auth_user_id/user_id at the new auth ids"
echo "  3. migrate-storage.mjs        — copy files into R2/MinIO"
