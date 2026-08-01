#!/bin/sh
# Remaps public.users.id from old (source project) auth ids to the new
# self-hosted auth ids, using the mapping built by migrate-auth.mjs.
#
# Why this is needed: public.users is a companion/profile table keyed 1:1
# with auth.users by id (see src/lib/queries/onboarding/store/createUserCore.ts
# — it inserts `id: userId` using the SAME id auth.admin.createUser returned).
# migrate-auth.mjs necessarily creates NEW auth.users ids (GoTrue assigns
# them, they can't be preserved), and migrate-public-data.sh's --data-only
# dump copies public.users rows as-is with their OLD ids — so after both of
# those steps, public.users.id no longer matches auth.users.id for any
# migrated account. Every admin/dashboard authorization check that resolves
# "which store does this logged-in user own" via public.users (e.g.
# getAuthenticatedStoreId.ts, useCurrentUser.ts) breaks as a result.
#
# 12 tables have a foreign key to public.users(id), none with ON UPDATE
# CASCADE, so a direct `UPDATE public.users SET id = ...` would fail with a
# constraint violation the moment any of those tables holds a row for that
# user. This script adds ON UPDATE CASCADE to all of them (preserving each
# constraint's existing ON DELETE behavior), then remaps every id that
# appears in the mapping file, in one transaction.
#
# Usage: docker/scripts/migrate-data/fix-public-users-ids.sh [dev|prod]
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAPPING_FILE="$SCRIPT_DIR/auth-id-mapping.json"

. "$DOCKER_DIR/scripts/lib-env.sh" "$1"
echo "Target: $ENV_NAME ($ENV_FILE)"

if [ ! -f "$MAPPING_FILE" ]; then
  echo "Error: $MAPPING_FILE not found. Run migrate-auth.mjs first." >&2
  exit 1
fi

SQL_FILE="$(mktemp)"
trap 'rm -f "$SQL_FILE"' EXIT

cat > "$SQL_FILE" <<'SQL'
BEGIN;

-- Add ON UPDATE CASCADE, preserving each constraint's existing ON DELETE behavior.
ALTER TABLE public.carts DROP CONSTRAINT carts_user_id_fkey;
ALTER TABLE public.carts ADD CONSTRAINT carts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.order_tracking DROP CONSTRAINT order_tracking_updated_by_fkey;
ALTER TABLE public.order_tracking ADD CONSTRAINT order_tracking_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE;

ALTER TABLE public.product_reviews DROP CONSTRAINT product_reviews_customer_id_fkey;
ALTER TABLE public.product_reviews ADD CONSTRAINT product_reviews_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.store_reviews DROP CONSTRAINT store_reviews_customer_id_fkey;
ALTER TABLE public.store_reviews ADD CONSTRAINT store_reviews_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.stores DROP CONSTRAINT stores_approved_by_fkey;
ALTER TABLE public.stores ADD CONSTRAINT stores_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE;

ALTER TABLE public.stores DROP CONSTRAINT stores_owner_id_fkey;
ALTER TABLE public.stores ADD CONSTRAINT stores_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_user_id_fkey;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.wishlists DROP CONSTRAINT wishlists_user_id_fkey;
ALTER TABLE public.wishlists ADD CONSTRAINT wishlists_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.stock_movements DROP CONSTRAINT stock_movements_created_by_fkey;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.vendor_orders DROP CONSTRAINT vendor_orders_created_by_fkey;
ALTER TABLE public.vendor_orders ADD CONSTRAINT vendor_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.vendor_settlements DROP CONSTRAINT vendor_settlements_created_by_fkey;
ALTER TABLE public.vendor_settlements ADD CONSTRAINT vendor_settlements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.vendor_payments DROP CONSTRAINT vendor_payments_created_by_fkey;
ALTER TABLE public.vendor_payments ADD CONSTRAINT vendor_payments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.vendor_stock_movements DROP CONSTRAINT vendor_stock_movements_created_by_fkey;
ALTER TABLE public.vendor_stock_movements ADD CONSTRAINT vendor_stock_movements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

SQL

node -e '
const fs = require("fs");
const mapping = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
for (const [oldId, newId] of Object.entries(mapping)) {
  console.log(
    `UPDATE public.users SET id = '"'"'${newId}'"'"' WHERE id = '"'"'${oldId}'"'"';`
  );
}
' "$MAPPING_FILE" >> "$SQL_FILE"

echo "COMMIT;" >> "$SQL_FILE"

docker exec -i shei-hoise-db psql -v ON_ERROR_STOP=1 -U postgres -d postgres < "$SQL_FILE"

echo "Done — public.users.id remapped to the new auth ids."
