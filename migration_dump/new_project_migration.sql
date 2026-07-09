-- ============================================================
-- Shei Hoise — New Supabase Project Migration
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS)
-- ============================================================


-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    user_type character varying(20) NOT NULL,
    email_verified boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    store_id uuid,
    CONSTRAINT users_user_type_check CHECK ((user_type = ANY (ARRAY['super_admin'::character varying, 'store_owner'::character varying, 'customer'::character varying]::text[])))
);

CREATE TABLE IF NOT EXISTS public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid,
    store_name character varying(255) NOT NULL,
    store_slug character varying(255) NOT NULL,
    description text,
    logo_url text,
    banner_url text,
    contact_email character varying(255),
    contact_phone character varying(20),
    business_address text,
    business_license character varying(100),
    tax_id character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying,
    approved_by uuid,
    approved_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stores_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'suspended'::text, 'rejected'::text, 'trial'::text])))
);

CREATE TABLE IF NOT EXISTS public.store_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    currency character varying(10) DEFAULT 'BDT'::character varying,
    tax_rate numeric(5,2) DEFAULT 0.00,
    free_shipping_threshold numeric(10,2),
    min_order_amount numeric(10,2) DEFAULT 0.00,
    processing_time_days integer DEFAULT 1,
    return_policy_days integer DEFAULT 7,
    terms_and_conditions text,
    privacy_policy text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    shipping_fees jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    parent_id uuid,
    image_url text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    store_id uuid
);

CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    category_id uuid,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    short_description text,
    base_price numeric(10,2) NOT NULL,
    sku character varying(100),
    weight numeric(8,2),
    dimensions jsonb,
    is_digital boolean DEFAULT false,
    status character varying(20) DEFAULT 'draft'::character varying,
    featured boolean DEFAULT false,
    meta_title character varying(255),
    meta_description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    discounted_price numeric,
    discount_amount numeric,
    tp_price numeric,
    CONSTRAINT products_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text, 'archived'::text])))
);

CREATE TABLE IF NOT EXISTS public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    variant_name character varying(255),
    sku character varying(100),
    attributes jsonb,
    weight numeric(8,2),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    color text,
    base_price numeric(10,2) DEFAULT 0.00 NOT NULL,
    discounted_price numeric(10,2),
    discount_amount numeric(10,2),
    tp_price numeric(10,2)
);

CREATE TABLE IF NOT EXISTS public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    variant_id uuid,
    image_url text NOT NULL,
    alt_text character varying(255),
    sort_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    variant_id uuid,
    quantity_available integer DEFAULT 0 NOT NULL,
    quantity_reserved integer DEFAULT 0,
    low_stock_threshold integer DEFAULT 5,
    track_inventory boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    customer_id uuid,
    order_id uuid,
    rating integer NOT NULL,
    review_title character varying(255),
    review_text text,
    is_verified_purchase boolean DEFAULT false,
    is_approved boolean DEFAULT true,
    helpful_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT product_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE IF NOT EXISTS public.store_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    phone text,
    email text,
    auth_user_id uuid,
    profile_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.customer_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_customer_id uuid NOT NULL,
    avatar_url text,
    date_of_birth date,
    gender text,
    address text,
    city text,
    state text,
    postal_code text,
    country text DEFAULT 'Bangladesh'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_profiles_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text])))
);

CREATE TABLE IF NOT EXISTS public.store_customer_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    store_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number character varying(50) NOT NULL,
    customer_id uuid,
    store_id uuid,
    status character varying(20) DEFAULT 'pending'::character varying,
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0.00,
    shipping_fee numeric(10,2) DEFAULT 0.00,
    total_amount numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'BDT'::character varying,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    payment_method character varying(50),
    shipping_address jsonb NOT NULL,
    billing_address jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    delivery_option text,
    discount_amount numeric,
    additional_charges numeric,
    CONSTRAINT orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])))
);

COMMENT ON COLUMN public.orders.delivery_option IS 'Delivery Option Like (Pathao, Courier)';

CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    product_id uuid,
    variant_id uuid,
    product_name character varying(255) NOT NULL,
    variant_details jsonb,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    status character varying(20) NOT NULL,
    message text,
    location character varying(255),
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_tracking_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])))
);

CREATE TABLE IF NOT EXISTS public.carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    store_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid,
    product_id uuid,
    variant_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    price_snapshot numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wishlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    product_id uuid,
    variant_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    customer_id uuid,
    order_id uuid,
    rating integer NOT NULL,
    review_title character varying(255),
    review_text text,
    is_verified_purchase boolean DEFAULT false,
    is_approved boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT store_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    avatar_url text,
    date_of_birth date,
    gender character varying(10),
    address_line_1 text,
    address_line_2 text,
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country character varying(100) DEFAULT 'Bangladesh'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_us (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    company_name text NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source text NOT NULL,
    is_solved boolean DEFAULT false NOT NULL
);


-- ============================================================
-- SUBSCRIPTION TABLES
-- ============================================================

CREATE TYPE IF NOT EXISTS public.subscription_status AS ENUM (
    'trialing', 'active', 'past_due', 'canceled', 'expired', 'paused', 'incomplete'
);

CREATE TYPE IF NOT EXISTS public.billing_cycle AS ENUM ('monthly', 'yearly');

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    name            varchar(100)  NOT NULL,
    slug            varchar(100)  NOT NULL UNIQUE,
    description     text,
    price_monthly   numeric(12,2) NOT NULL DEFAULT 0,
    price_yearly    numeric(12,2) NOT NULL DEFAULT 0,
    currency        char(3)       NOT NULL DEFAULT 'BDT',
    features        jsonb         NOT NULL DEFAULT '{}',
    limits          jsonb         NOT NULL DEFAULT '{}',
    trial_days      integer       NOT NULL DEFAULT 0,
    is_active       boolean       NOT NULL DEFAULT true,
    is_featured     boolean       NOT NULL DEFAULT false,
    is_public       boolean       NOT NULL DEFAULT true,
    sort_order      integer       NOT NULL DEFAULT 0,
    created_at      timestamptz   NOT NULL DEFAULT now(),
    updated_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_subscriptions (
    id              uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        uuid                        NOT NULL,
    user_id         uuid                        NOT NULL,
    plan_id         uuid                        NOT NULL,
    status          public.subscription_status  NOT NULL DEFAULT 'incomplete',
    billing_cycle   public.billing_cycle        NOT NULL DEFAULT 'monthly',
    started_at                  timestamptz NOT NULL DEFAULT now(),
    expires_at                  timestamptz,
    trial_ends_at               timestamptz,
    canceled_at                 timestamptz,
    cancels_at_period_end       boolean     NOT NULL DEFAULT false,
    current_period_start        timestamptz NOT NULL DEFAULT now(),
    current_period_end          timestamptz,
    payment_provider                 varchar(50),
    payment_provider_customer_id     varchar(255),
    payment_provider_subscription_id varchar(255),
    metadata        jsonb       NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT one_active_per_store UNIQUE (store_id)
);


-- ============================================================
-- PRIMARY KEYS
-- ============================================================

ALTER TABLE ONLY public.users            ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.stores           ADD CONSTRAINT stores_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.store_settings   ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.categories       ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.products         ADD CONSTRAINT products_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.product_variants ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.product_images   ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.product_inventory ADD CONSTRAINT product_inventory_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.product_reviews  ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.store_customers  ADD CONSTRAINT store_customers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.customer_profiles ADD CONSTRAINT customer_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.store_customer_links ADD CONSTRAINT store_customer_links_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.orders           ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.order_items      ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.order_tracking   ADD CONSTRAINT order_tracking_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.carts            ADD CONSTRAINT carts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cart_items       ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wishlists        ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.store_reviews    ADD CONSTRAINT store_reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_profiles    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.contact_us       ADD CONSTRAINT demo_requests_pkey PRIMARY KEY (id);


-- ============================================================
-- UNIQUE CONSTRAINTS
-- ============================================================

ALTER TABLE ONLY public.users            ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.stores           ADD CONSTRAINT stores_store_slug_key UNIQUE (store_slug);
ALTER TABLE ONLY public.product_variants ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);
ALTER TABLE ONLY public.products         ADD CONSTRAINT products_store_id_slug_key UNIQUE (store_id, slug);
ALTER TABLE ONLY public.product_inventory ADD CONSTRAINT product_inventory_product_id_variant_id_key UNIQUE (product_id, variant_id);
ALTER TABLE ONLY public.product_reviews  ADD CONSTRAINT product_reviews_product_id_customer_id_order_id_key UNIQUE (product_id, customer_id, order_id);
ALTER TABLE ONLY public.store_customers  ADD CONSTRAINT store_customers_email_key UNIQUE (email);
ALTER TABLE ONLY public.store_customer_links ADD CONSTRAINT store_customer_links_customer_id_store_id_key UNIQUE (customer_id, store_id);
ALTER TABLE ONLY public.store_reviews    ADD CONSTRAINT store_reviews_store_id_customer_id_order_id_key UNIQUE (store_id, customer_id, order_id);
ALTER TABLE ONLY public.orders           ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
ALTER TABLE ONLY public.carts            ADD CONSTRAINT carts_user_id_store_id_key UNIQUE (user_id, store_id);
ALTER TABLE ONLY public.wishlists        ADD CONSTRAINT wishlists_user_id_product_id_variant_id_key UNIQUE (user_id, product_id, variant_id);


-- ============================================================
-- FOREIGN KEYS
-- ============================================================

-- users <-> stores (circular — stores.owner_id added after stores exists)
ALTER TABLE ONLY public.stores           ADD CONSTRAINT stores_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.stores           ADD CONSTRAINT stores_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.users            ADD CONSTRAINT users_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);

ALTER TABLE ONLY public.store_settings   ADD CONSTRAINT store_settings_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_profiles    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.categories       ADD CONSTRAINT categories_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);
ALTER TABLE ONLY public.categories       ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);

ALTER TABLE ONLY public.products         ADD CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.products         ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);

ALTER TABLE ONLY public.product_variants ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.product_images   ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.product_images   ADD CONSTRAINT product_images_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.product_inventory ADD CONSTRAINT product_inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.product_inventory ADD CONSTRAINT product_inventory_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.product_reviews  ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.product_reviews  ADD CONSTRAINT product_reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.product_reviews  ADD CONSTRAINT product_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.store_customers  ADD CONSTRAINT store_customers_auth_user_id_fkey1 FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);
ALTER TABLE ONLY public.store_customers  ADD CONSTRAINT store_customers_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.customer_profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.customer_profiles ADD CONSTRAINT customer_profiles_store_customer_id_fkey FOREIGN KEY (store_customer_id) REFERENCES public.store_customers(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.store_customer_links ADD CONSTRAINT store_customer_links_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.store_customers(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.store_customer_links ADD CONSTRAINT store_customer_links_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.orders           ADD CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.orders           ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.store_customers(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.order_items      ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.order_items      ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.order_items      ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.order_tracking   ADD CONSTRAINT order_tracking_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.order_tracking   ADD CONSTRAINT order_tracking_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.carts            ADD CONSTRAINT carts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.carts            ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.cart_items       ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.cart_items       ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.cart_items       ADD CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wishlists        ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.wishlists        ADD CONSTRAINT wishlists_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.wishlists        ADD CONSTRAINT wishlists_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.store_reviews    ADD CONSTRAINT store_reviews_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.store_reviews    ADD CONSTRAINT store_reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.store_reviews    ADD CONSTRAINT store_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

-- Subscription FKs
ALTER TABLE ONLY public.store_subscriptions ADD CONSTRAINT store_subscriptions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.store_subscriptions ADD CONSTRAINT store_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.store_subscriptions ADD CONSTRAINT store_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE RESTRICT;


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_store_subscriptions_store_id   ON public.store_subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_store_subscriptions_user_id    ON public.store_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_store_subscriptions_plan_id    ON public.store_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_store_subscriptions_status     ON public.store_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_store_subscriptions_expires_at ON public.store_subscriptions(expires_at) WHERE expires_at IS NOT NULL;


-- ============================================================
-- TRIGGERS (updated_at)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_store_subscriptions_updated_at
    BEFORE UPDATE ON public.store_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.subscription_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read" ON public.subscription_plans
    FOR SELECT USING (is_public = true AND is_active = true);

CREATE POLICY "plans_service_write" ON public.subscription_plans
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "subscriptions_owner_read" ON public.store_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_service_write" ON public.store_subscriptions
    FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- GRANTS
-- ============================================================

GRANT ALL ON TABLE public.cart_items          TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.carts               TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.categories          TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.contact_us          TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.customer_profiles   TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.order_items         TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.order_tracking      TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.orders              TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_images      TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_inventory   TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_reviews     TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_variants    TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products            TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.store_customer_links TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.store_customers     TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.store_reviews       TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.store_settings      TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.stores              TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_profiles       TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.users               TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.wishlists           TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subscription_plans  TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.store_subscriptions TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES     TO postgres, anon, authenticated, service_role;


-- ============================================================
-- SEED: Subscription Plans
-- ============================================================

INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, currency, trial_days, is_featured, sort_order, features, limits)
VALUES (
    'Pro', 'pro', 'Everything you need to scale',
    999, 0, 'BDT', 0, true, 0,
    '{"pos": true, "analytics": true, "custom_domain": true}',
    '{"max_products": -1, "max_orders_per_month": -1, "max_images_per_product": -1}'
)
ON CONFLICT (slug) DO NOTHING;
