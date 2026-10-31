-- Each store's membership card and welcome email.
--
--   membership_card_designs   one row per store:
--     blank_path   the store's card picture with the member's name and number
--                  taken out, kept in the private storage bucket
--                  "membership-cards" at <store_id>/blank.png
--     name_slot / number_slot   where the member's name and membership number
--                  are written on that picture, and in which font, colour and
--                  alignment (pixel coordinates of the picture)
--     email_enabled, email_brand   whether a welcome email is sent when a
--                  membership is given, and the wording/colours it uses
--   customer_memberships.welcome_email_*   when the welcome email went out,
--                  to whom, and why it failed if it did
--
-- Requires 20261107000000_add_customer_memberships.sql. Additive: a new table,
-- nullable columns and a new bucket, so existing rows and running code are
-- untouched. Apply this BEFORE deploying the code that reads them.
--
-- Writes go through supabaseAdmin in permission-checked server actions
-- (memberships.*); the card picture is only ever read on the server.
CREATE TABLE IF NOT EXISTS "public"."membership_card_designs" (
    "store_id" uuid NOT NULL PRIMARY KEY REFERENCES "public"."stores"("id") ON DELETE CASCADE,
    "blank_path" text,
    "image_width" integer,
    "image_height" integer,
    "name_slot" jsonb,
    "number_slot" jsonb,
    "email_enabled" boolean DEFAULT true NOT NULL,
    "email_brand" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."membership_card_designs" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."membership_card_designs" TO "service_role";
GRANT SELECT ON TABLE "public"."membership_card_designs" TO "authenticated";

ALTER TABLE "public"."membership_card_designs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_card_designs_store_select" ON "public"."membership_card_designs";
CREATE POLICY "membership_card_designs_store_select" ON "public"."membership_card_designs" FOR SELECT TO "authenticated" USING (
  "store_id" IN (SELECT u."store_id" FROM "public"."users" u WHERE u."id" = auth.uid())
);

ALTER TABLE "public"."customer_memberships"
  ADD COLUMN IF NOT EXISTS "welcome_email_to" text,
  ADD COLUMN IF NOT EXISTS "welcome_email_sent_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "welcome_email_error" text;

-- Private bucket for the blank card pictures. If your storage schema rejects
-- this, create a private bucket named "membership-cards" in Studio instead.
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('membership-cards', 'membership-cards', false)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create the membership-cards bucket (%). Create it in Studio as a private bucket.', SQLERRM;
END $$;
