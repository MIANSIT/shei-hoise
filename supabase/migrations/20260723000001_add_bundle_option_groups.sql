-- Bundle choice groups: rows in bundle_items that share the same
-- option_group_id are alternatives for one slot in the bundle — the
-- customer picks exactly one at add-to-cart time (see cart_items.bundle
-- selections handling in application code). Rows with option_group_id
-- NULL stay fixed/required, unchanged from the original bundle behavior.
-- option_group_label is duplicated across every row in a group (no
-- separate group table, same "the row is the data" approach used for
-- order_items.parent_order_item_id in the previous migration) and is
-- validated for consistency at the application layer, not here.

ALTER TABLE "public"."bundle_items"
  ADD COLUMN IF NOT EXISTS "option_group_id" "uuid",
  ADD COLUMN IF NOT EXISTS "option_group_label" "text";

CREATE INDEX IF NOT EXISTS "bundle_items_option_group_id_idx" ON "public"."bundle_items" ("option_group_id");
