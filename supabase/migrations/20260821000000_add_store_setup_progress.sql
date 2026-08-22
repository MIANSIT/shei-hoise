-- Tracks which "Complete Your Store Setup" wizard steps have been saved
-- (e.g. '["identity","description"]'), so progress survives navigating away
-- and back — the wizard page unmounts on route change, so React-only state
-- was resetting to 0 every time despite the underlying data already being
-- saved. Default '[]' applies to existing rows automatically (Postgres fast
-- default fill), no backfill statement needed.
ALTER TABLE "public"."stores"
  ADD COLUMN IF NOT EXISTS "setup_progress" jsonb DEFAULT '[]'::jsonb NOT NULL;
