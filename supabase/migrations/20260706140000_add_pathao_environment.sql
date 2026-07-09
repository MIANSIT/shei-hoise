-- Pathao Courier integration — track which environment (sandbox/live) each
-- store's connection uses, so API calls can route to the right host.
-- Safe to run multiple times.

ALTER TABLE "public"."store_pathao_credentials"
  ADD COLUMN IF NOT EXISTS "environment" character varying(10) NOT NULL DEFAULT 'sandbox';

DO $$ BEGIN
  ALTER TABLE "public"."store_pathao_credentials"
    ADD CONSTRAINT "store_pathao_credentials_environment_check"
    CHECK (("environment")::"text" = ANY (ARRAY[('sandbox'::character varying)::"text", ('live'::character varying)::"text"]));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
