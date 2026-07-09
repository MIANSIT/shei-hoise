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

-- Conversions API credentials + delivery courier list on store_settings
-- (see 20260703120000_facebook_commerce_and_trial_system.sql, 20260707130000_add_delivery_couriers.sql)
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS facebook_capi_access_token text,
  ADD COLUMN IF NOT EXISTS facebook_test_event_code character varying,
  ADD COLUMN IF NOT EXISTS delivery_couriers jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.store_settings
  ALTER COLUMN delivery_couriers SET DEFAULT
  '[{"id":"pathao","name":"Pathao","type":"pathao","deletable":false,"created_at":"2026-01-01T00:00:00.000Z"},
    {"id":"steadfast","name":"Steadfast","type":"steadfast","deletable":false,"created_at":"2026-01-01T00:00:00.000Z"}]'::jsonb;

-- CAPI delivery tracking on pixel_events (see same migration as above)
ALTER TABLE public.pixel_events
  ADD COLUMN IF NOT EXISTS capi_delivered boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS capi_error text;

-- Default trial plan flag — exactly one subscription_plans row may have this set
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS is_default_trial_plan boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS one_default_trial_plan
  ON public.subscription_plans (is_default_trial_plan)
  WHERE is_default_trial_plan = true;

-- Facebook Purchase-event send status + delivery courier per order
-- (see 20260703120000_facebook_commerce_and_trial_system.sql, 20260707120000_add_steadfast_courier.sql —
--  the pathao-only shipment columns this migration also added were later replaced by the
--  courier_tracking table below and dropped, so they are intentionally not recreated here)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fb_purchase_event_status character varying(20) DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS courier character varying(20);

DO $$ BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_fb_purchase_event_status_check
    CHECK (fb_purchase_event_status::text = ANY (ARRAY['sent'::character varying, 'held'::character varying, 'suppressed'::character varying]::text[]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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

-- No anon/authenticated insert policy: all pixel event inserts go exclusively
-- through the service-role API route (/api/pixel-event) — see
-- 20260703120000_facebook_commerce_and_trial_system.sql, which drops the
-- public_insert policy this table originally shipped with.

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

-- 6. New table: customer_risk_profiles + customer_risk_store_touches
--    COD fake-order risk scoring. customer_risk_profiles is deliberately NOT
--    scoped by store_id — pooling signal across every store on the platform
--    is the point. Both are service_role-only: RLS is enabled with no
--    policies for anon/authenticated, so those roles get zero access.
--    (see 20260703120000_facebook_commerce_and_trial_system.sql)
CREATE TABLE IF NOT EXISTS public.customer_risk_profiles (
  phone_number     text PRIMARY KEY,
  total_orders     integer NOT NULL DEFAULT 0,
  delivered_orders integer NOT NULL DEFAULT 0,
  cancelled_orders integer NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_risk_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.customer_risk_store_touches (
  phone_number text NOT NULL,
  store_id     uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (phone_number, store_id)
);
ALTER TABLE public.customer_risk_store_touches ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.customer_risk_profiles TO service_role;
GRANT ALL ON TABLE public.customer_risk_store_touches TO service_role;

-- 7. New table: store_courier_credentials
--    Started as store_pathao_credentials (Pathao-only OAuth creds), then
--    widened into a generic multi-courier, multi-account-per-store table.
--    Holds secrets as application-level ciphertext (see src/lib/utils/encryption.ts).
--    Service-role only: RLS enabled with no anon/authenticated policies — all
--    reads/writes go through "use server" actions using supabaseAdmin.
--    (see 20260706120000_add_pathao_credentials.sql, 20260706140000_add_pathao_environment.sql,
--     20260706150000_pathao_multiple_accounts.sql, 20260707120000_add_steadfast_courier.sql,
--     20260708100000_add_pathao_webhook_secret.sql)
CREATE TABLE IF NOT EXISTS public.store_courier_credentials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  courier           character varying(20) NOT NULL CHECK (courier::text = ANY (ARRAY['pathao'::character varying, 'steadfast'::character varying]::text[])),
  label             character varying(100) NOT NULL DEFAULT 'Pathao Account',
  client_id         text,
  client_secret     text,
  api_key           text,
  secret_key        text,
  webhook_secret    text,
  access_token      text,
  refresh_token     text,
  token_expires_at  timestamptz,
  environment       character varying(10) NOT NULL DEFAULT 'sandbox' CHECK (environment::text = ANY (ARRAY['sandbox'::character varying, 'live'::character varying]::text[])),
  pathao_store_id   integer,
  pathao_store_name character varying(255),
  connected_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
-- Note: a store may have several courier accounts (e.g. multiple Pathao
-- merchant accounts), so store_id is intentionally NOT unique here.
ALTER TABLE public.store_courier_credentials ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.store_courier_credentials TO service_role;

-- 8. New table: courier_tracking
--    One row per shipment; replaces the old pathao_*/courier_* columns that
--    used to live directly on orders (dropped once this table took over).
--    Service-role only, same access pattern as store_courier_credentials.
--    (see 20260707160000_add_courier_tracking_table.sql)
CREATE TABLE IF NOT EXISTS public.courier_tracking (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id              uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  courier               character varying(20) NOT NULL,
  courier_credential_id uuid REFERENCES public.store_courier_credentials(id) ON DELETE SET NULL,
  consignment_id        text NOT NULL,
  status                character varying(100),
  shipment_details      jsonb,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Postgres enforces "at most one active shipment per order" instead of application code.
CREATE UNIQUE INDEX IF NOT EXISTS courier_tracking_one_active_per_order ON public.courier_tracking (order_id) WHERE (is_active);
CREATE INDEX IF NOT EXISTS courier_tracking_order_id_idx ON public.courier_tracking (order_id);
CREATE INDEX IF NOT EXISTS courier_tracking_store_courier_idx ON public.courier_tracking (store_id, courier);

ALTER TABLE public.courier_tracking ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.courier_tracking TO service_role;

-- 9. New table: pathao_webhook_debug_log
--    Temporary capture table for raw Pathao webhook payloads, so the real
--    shape of events (Delivered, Payment Invoice, etc.) can be inspected
--    once triggered instead of guessing field names in advance. Not
--    FK-constrained to store_courier_credentials — the incoming credential_id
--    comes from an unauthenticated public URL and shouldn't fail the insert
--    just because it's malformed or stale.
--    (see 20260708100000_add_pathao_webhook_secret.sql)
CREATE TABLE IF NOT EXISTS public.pathao_webhook_debug_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid,
  headers       jsonb,
  body          jsonb,
  received_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pathao_webhook_debug_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.pathao_webhook_debug_log TO service_role;

-- 10. New table: stock_movements (append-only inventory audit trail, plus the
--    atomic adjust_inventory/set_inventory RPCs the app calls to write it —
--    added 2026-07-09, see supabase/migrations/20260709000000_add_stock_movements_and_atomic_inventory.sql)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id        uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  delta             integer NOT NULL,
  previous_quantity integer NOT NULL,
  new_quantity      integer NOT NULL,
  reason            character varying(50) NOT NULL DEFAULT 'manual_adjustment',
  note              text,
  created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_product_id_idx ON public.stock_movements (product_id);
CREATE INDEX IF NOT EXISTS stock_movements_variant_id_idx ON public.stock_movements (variant_id);
CREATE INDEX IF NOT EXISTS stock_movements_created_at_idx ON public.stock_movements (created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies — all access goes through supabaseAdmin (service_role only).

GRANT ALL ON TABLE public.stock_movements TO service_role;

CREATE OR REPLACE FUNCTION public.adjust_inventory(
    p_product_id uuid,
    p_variant_id uuid,
    p_delta integer,
    p_reason character varying DEFAULT 'manual_adjustment',
    p_note text DEFAULT NULL,
    p_created_by uuid DEFAULT NULL
) RETURNS TABLE(previous_quantity integer, new_quantity integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_prev integer;
  v_new integer;
BEGIN
  SELECT quantity_available INTO v_prev
  FROM public.product_inventory
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No inventory row for product % / variant %', p_product_id, p_variant_id;
  END IF;

  v_new := v_prev + p_delta;

  IF v_new < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: have %, requested change %', v_prev, p_delta;
  END IF;

  UPDATE public.product_inventory
  SET quantity_available = v_new, updated_at = now()
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id;

  INSERT INTO public.stock_movements
    (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
  VALUES
    (p_product_id, p_variant_id, p_delta, v_prev, v_new, COALESCE(p_reason, 'manual_adjustment'), p_note, p_created_by);

  RETURN QUERY SELECT v_prev, v_new;
END;
$$;
GRANT ALL ON FUNCTION public.adjust_inventory(uuid, uuid, integer, character varying, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.set_inventory(
    p_product_id uuid,
    p_variant_id uuid,
    p_quantity integer,
    p_reason character varying DEFAULT 'recount',
    p_note text DEFAULT NULL,
    p_created_by uuid DEFAULT NULL
) RETURNS TABLE(previous_quantity integer, new_quantity integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_prev integer;
BEGIN
  IF p_quantity < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative';
  END IF;

  SELECT quantity_available INTO v_prev
  FROM public.product_inventory
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No inventory row for product % / variant %', p_product_id, p_variant_id;
  END IF;

  UPDATE public.product_inventory
  SET quantity_available = p_quantity, updated_at = now()
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id;

  INSERT INTO public.stock_movements
    (product_id, variant_id, delta, previous_quantity, new_quantity, reason, note, created_by)
  VALUES
    (p_product_id, p_variant_id, p_quantity - v_prev, v_prev, p_quantity, COALESCE(p_reason, 'recount'), p_note, p_created_by);

  RETURN QUERY SELECT v_prev, p_quantity;
END;
$$;
GRANT ALL ON FUNCTION public.set_inventory(uuid, uuid, integer, character varying, text, uuid) TO service_role;

SELECT 'Schema fixup complete' AS result;
