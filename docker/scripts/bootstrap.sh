#!/bin/sh
# Brings the whole stack up in the order self-hosted Supabase actually needs:
# db -> (auth, storage, rest[, minio in dev]) self-migrate/settle -> our
# migrations -> buckets -> everything else. See docker/README.md for why this
# ordering matters.
#
# Usage: bootstrap.sh [dev|prod]  (default: dev)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

. "$SCRIPT_DIR/lib-env.sh" "$1"
echo "Target: $ENV_NAME ($ENV_FILE)"

wait_healthy() {
  container="$1"
  echo "Waiting for $container to be healthy..."
  for _ in $(seq 1 60); do
    status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "starting")
    if [ "$status" = "healthy" ]; then
      echo "  -> $container is healthy"
      return 0
    fi
    sleep 2
  done
  echo "Error: $container did not become healthy in time." >&2
  docker logs --tail 50 "$container" >&2 || true
  exit 1
}

echo "== Step 1/5: starting db =="
$COMPOSE up -d db
wait_healthy shei-hoise-db

if [ "$ENV_NAME" = "dev" ]; then
  echo "== Step 2/5: starting auth, storage, rest, minio (self-migration) =="
  $COMPOSE up -d auth rest minio minio-createbucket
else
  echo "== Step 2/5: starting auth, rest (storage talks directly to R2 in prod) =="
  $COMPOSE up -d auth rest
fi
wait_healthy shei-hoise-rest
$COMPOSE up -d storage
wait_healthy shei-hoise-storage
wait_healthy shei-hoise-auth
echo "Tail auth/storage logs above to confirm their schemas migrated cleanly."

echo "== Step 3/5: applying supabase/migrations =="
"$SCRIPT_DIR/apply-migrations.sh" "$ENV_NAME"

echo "== Step 4/5: starting kong (+ studio, meta) — needed to reach the Storage API =="
$COMPOSE up -d studio meta kong
wait_healthy shei-hoise-kong

echo "== Step 5/5: creating storage buckets, then starting the app =="
"$SCRIPT_DIR/create-buckets.sh" "$ENV_NAME"
$COMPOSE up -d --build app

echo ""
echo "Stack is up ($ENV_NAME):"
echo "  App:     http://localhost:3000"
echo "  Studio:  http://localhost:8000 (via Kong, basic-auth from $ENV_FILE)"
if [ "$ENV_NAME" = "dev" ]; then
  echo "  MinIO:   http://localhost:9001 (console)"
fi
