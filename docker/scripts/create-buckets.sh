#!/bin/sh
# Creates the storage buckets the app expects — nothing in supabase/migrations
# does this (it was done via Studio/dashboard on the cloud project originally).
# Idempotent: safe to re-run.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

set -a
. "$DOCKER_DIR/.env"
set +a

BASE_URL="${SUPABASE_PUBLIC_URL:-http://localhost:${KONG_HTTP_PORT}}"
BUCKETS="store_logo store-banner shei-hoise-product"

for bucket in $BUCKETS; do
  echo "Creating bucket '$bucket' (public)..."
  http_code=$(curl -s -o /tmp/create-bucket-response.json -w "%{http_code}" \
    -X POST "$BASE_URL/storage/v1/bucket" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"${bucket}\",\"name\":\"${bucket}\",\"public\":true}")

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "  -> created"
  elif grep -q "already exists" /tmp/create-bucket-response.json 2>/dev/null; then
    echo "  -> already exists, skipping"
  else
    echo "  -> unexpected response (HTTP $http_code):"
    cat /tmp/create-bucket-response.json
    exit 1
  fi
done

rm -f /tmp/create-bucket-response.json
echo "Buckets ready."
