-- Multiple announcement lines per store, replacing the one-line-only limit of
-- store_branding.announcement_text. Same shape/RLS split as store_hero_slides
-- and store_promo_banners (admin-managed list, sort_order, is_active) — the
-- storefront ticker now rotates through every active row here instead of a
-- single free-text field. store_branding.announcement_text is left in place
-- (nothing reads it after this ships) rather than dropped, and any store that
-- already had one is backfilled below as its first announcement so existing
-- stores keep showing what they already set.

CREATE TABLE IF NOT EXISTS "public"."store_announcements" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "store_id" uuid NOT NULL,
    "text" text NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."store_announcements" OWNER TO "postgres";

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_announcements"
    ADD CONSTRAINT "store_announcements_pkey" PRIMARY KEY ("id");
-- invalid_table_definition (42P16, "multiple primary keys... not allowed") is
-- what a re-run actually hits here, not duplicate_object — adding a second
-- PRIMARY KEY constraint fails that check before it ever gets to comparing
-- constraint names.
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."store_announcements"
    ADD CONSTRAINT "store_announcements_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "store_announcements_store_sort_idx"
  ON "public"."store_announcements" ("store_id", "sort_order");

GRANT ALL ON TABLE "public"."store_announcements" TO "service_role";

ALTER TABLE "public"."store_announcements" ENABLE ROW LEVEL SECURITY;

-- Same split as store_hero_slides: anonymous storefront visitors only ever
-- need active announcements (getActiveAnnouncements filters this again
-- itself, but scoping the policy too means a disabled announcement is never
-- reachable via the anon key at all). The admin's own list (including
-- inactive) goes through supabaseAdmin, which bypasses RLS entirely.
DO $$ BEGIN
  CREATE POLICY "store_announcements_public_read" ON "public"."store_announcements" FOR SELECT USING (("is_active" = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "store_announcements_service_write" ON "public"."store_announcements" USING (("auth"."role"() = 'service_role'::"text"));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE "public"."store_announcements" IS
  'Admin-managed announcement-bar lines for a store''s storefront (rotated as a scrolling ticker when more than one is active). Superset of the legacy store_branding.announcement_text single line, backfilled from it once below.';

-- One-time backfill: a store that already had a manual announcement_text
-- becomes that text's owner here too, so existing storefronts keep showing
-- it unchanged the moment this ships — nobody has to re-type what they
-- already set just because the field moved to its own table.
INSERT INTO "public"."store_announcements" ("store_id", "text", "sort_order", "is_active")
SELECT "store_id", trim("announcement_text"), 0, true
FROM "public"."store_branding"
WHERE "announcement_text" IS NOT NULL
  AND trim("announcement_text") <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "public"."store_announcements" sa WHERE sa."store_id" = "store_branding"."store_id"
  );
