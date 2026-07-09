-- ============================================================
-- Schema fixup for new Supabase project
-- Adds columns & tables present in old DB but missing from
-- the initial migration (new_project_migration.sql).
-- ============================================================

-- 1. Missing columns on existing tables
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS facebook_pixel_id character varying DEFAULT NULL;

ALTER TABLE public.contact_us
  ADD COLUMN IF NOT EXISTS phone_number character varying DEFAULT NULL;

-- 2. New table: expense_categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid REFERENCES public.stores(id) ON DELETE NO ACTION,
  name        character varying NOT NULL,
  description text,
  icon        character varying,
  color       character varying,
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  is_active   boolean NOT NULL DEFAULT true
);

-- 3. New table: expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES public.stores(id) ON DELETE NO ACTION,
  category_id    uuid NOT NULL REFERENCES public.expense_categories(id) ON DELETE NO ACTION,
  amount         numeric NOT NULL,
  title          character varying NOT NULL,
  description    text,
  expense_date   date NOT NULL DEFAULT CURRENT_DATE,
  vendor_name    character varying,
  payment_method character varying,
  platform       character varying,
  notes          text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_category_id  ON public.expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date          ON public.expenses (expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date     ON public.expenses (store_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id       ON public.expenses (store_id);

-- 4. New table: pixel_events
CREATE TABLE IF NOT EXISTS public.pixel_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  metadata   jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pixel_events_store_created
  ON public.pixel_events (store_id, created_at DESC);

ALTER TABLE public.pixel_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY owner_read ON public.pixel_events
    FOR SELECT TO public
    USING (store_id IN (SELECT store_id FROM public.users WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY public_insert ON public.pixel_events
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. New table: store_social_media
CREATE TABLE IF NOT EXISTS public.store_social_media (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  facebook_link  text,
  instagram_link text,
  twitter_link   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  youtube_link   text,
  updated_at     timestamptz DEFAULT now(),
  CONSTRAINT store_social_media_unique_store UNIQUE (store_id)
);

-- Grants (match existing pattern)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pixel_events TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_social_media TO anon, authenticated, service_role;

SELECT 'Schema fixup complete' AS result;
