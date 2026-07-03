


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."billing_cycle" AS ENUM (
    'monthly',
    'yearly'
);


ALTER TYPE "public"."billing_cycle" OWNER TO "postgres";


CREATE TYPE "public"."invoice_status" AS ENUM (
    'unpaid',
    'paid',
    'overdue',
    'cancelled',
    'refunded'
);


ALTER TYPE "public"."invoice_status" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'expired',
    'paused',
    'incomplete'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_subscription_on_invoice_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    if new.paid_at is null then
      new.paid_at := now();
    end if;

    update store_subscriptions
    set
      status = 'active',
      current_period_start = new.period_start,
      current_period_end = new.period_end,
      expires_at = new.period_end,
      updated_at = now()
    where id = new.subscription_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_subscription_on_invoice_paid"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid",
    "product_id" "uuid",
    "variant_id" "uuid",
    "quantity" integer DEFAULT 1 NOT NULL,
    "price_snapshot" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "store_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "slug" character varying(255) NOT NULL,
    "description" "text",
    "parent_id" "uuid",
    "image_url" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "store_id" "uuid"
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_us" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "company_name" "text" NOT NULL,
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" NOT NULL,
    "is_solved" boolean DEFAULT false NOT NULL,
    "phone_number" character varying
);


ALTER TABLE "public"."contact_us" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_customer_id" "uuid" NOT NULL,
    "avatar_url" "text",
    "date_of_birth" "date",
    "gender" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "postal_code" "text",
    "country" "text" DEFAULT 'Bangladesh'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "customer_profiles_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."customer_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid",
    "name" character varying NOT NULL,
    "description" "text",
    "icon" character varying,
    "color" character varying,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."expense_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "title" character varying NOT NULL,
    "description" "text",
    "expense_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "vendor_name" character varying,
    "payment_method" character varying,
    "platform" character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "product_id" "uuid",
    "variant_id" "uuid",
    "product_name" character varying(255) NOT NULL,
    "variant_details" "jsonb",
    "quantity" integer NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "status" character varying(20) NOT NULL,
    "message" "text",
    "location" character varying(255),
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "order_tracking_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('confirmed'::character varying)::"text", ('shipped'::character varying)::"text", ('delivered'::character varying)::"text", ('cancelled'::character varying)::"text"])))
);


ALTER TABLE "public"."order_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" character varying(50) NOT NULL,
    "customer_id" "uuid",
    "store_id" "uuid",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "subtotal" numeric(10,2) NOT NULL,
    "tax_amount" numeric(10,2) DEFAULT 0.00,
    "shipping_fee" numeric(10,2) DEFAULT 0.00,
    "total_amount" numeric(10,2) NOT NULL,
    "currency" character varying(10) DEFAULT 'BDT'::character varying,
    "payment_status" character varying(20) DEFAULT 'pending'::character varying,
    "payment_method" character varying(50),
    "shipping_address" "jsonb" NOT NULL,
    "billing_address" "jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "delivery_option" "text",
    "discount_amount" numeric,
    "additional_charges" numeric,
    CONSTRAINT "orders_payment_status_check" CHECK ((("payment_status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('paid'::character varying)::"text", ('failed'::character varying)::"text", ('refunded'::character varying)::"text"]))),
    CONSTRAINT "orders_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('confirmed'::character varying)::"text", ('shipped'::character varying)::"text", ('delivered'::character varying)::"text", ('cancelled'::character varying)::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."delivery_option" IS 'Delivery Option Like (Pathao, Courier)';



CREATE TABLE IF NOT EXISTS "public"."pixel_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "event_name" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pixel_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "variant_id" "uuid",
    "image_url" "text" NOT NULL,
    "alt_text" character varying(255),
    "sort_order" integer DEFAULT 0,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "variant_id" "uuid",
    "quantity_available" integer DEFAULT 0 NOT NULL,
    "quantity_reserved" integer DEFAULT 0,
    "low_stock_threshold" integer DEFAULT 5,
    "track_inventory" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "customer_id" "uuid",
    "order_id" "uuid",
    "rating" integer NOT NULL,
    "review_title" character varying(255),
    "review_text" "text",
    "is_verified_purchase" boolean DEFAULT false,
    "is_approved" boolean DEFAULT true,
    "helpful_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "product_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."product_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "variant_name" character varying(255),
    "sku" character varying(100),
    "attributes" "jsonb",
    "weight" numeric(8,2),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "color" "text",
    "base_price" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "discounted_price" numeric(10,2),
    "discount_amount" numeric(10,2),
    "tp_price" numeric(10,2)
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid",
    "category_id" "uuid",
    "name" character varying(255) NOT NULL,
    "slug" character varying(255) NOT NULL,
    "description" "text",
    "short_description" "text",
    "base_price" numeric(10,2) NOT NULL,
    "sku" character varying(100),
    "weight" numeric(8,2),
    "dimensions" "jsonb",
    "is_digital" boolean DEFAULT false,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "featured" boolean DEFAULT false,
    "meta_title" character varying(255),
    "meta_description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "discounted_price" numeric,
    "discount_amount" numeric,
    "tp_price" numeric,
    CONSTRAINT "products_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('draft'::character varying)::"text", ('active'::character varying)::"text", ('inactive'::character varying)::"text", ('archived'::character varying)::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_customer_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."store_customer_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "phone" "text",
    "email" "text",
    "auth_user_id" "uuid",
    "profile_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."store_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid",
    "customer_id" "uuid",
    "order_id" "uuid",
    "rating" integer NOT NULL,
    "review_title" character varying(255),
    "review_text" "text",
    "is_verified_purchase" boolean DEFAULT false,
    "is_approved" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "store_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."store_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid",
    "currency" character varying(10) DEFAULT 'BDT'::character varying,
    "tax_rate" numeric(5,2) DEFAULT 0.00,
    "free_shipping_threshold" numeric(10,2),
    "min_order_amount" numeric(10,2) DEFAULT 0.00,
    "processing_time_days" integer DEFAULT 1,
    "return_policy_days" integer DEFAULT 7,
    "terms_and_conditions" "text",
    "privacy_policy" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "shipping_fees" "jsonb" DEFAULT '[]'::"jsonb",
    "facebook_pixel_id" character varying
);


ALTER TABLE "public"."store_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_social_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "facebook_link" "text",
    "instagram_link" "text",
    "twitter_link" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "youtube_link" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."store_social_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "public"."subscription_status" DEFAULT 'incomplete'::"public"."subscription_status" NOT NULL,
    "billing_cycle" "public"."billing_cycle" DEFAULT 'monthly'::"public"."billing_cycle" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "trial_ends_at" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "cancels_at_period_end" boolean DEFAULT false NOT NULL,
    "current_period_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_period_end" timestamp with time zone,
    "payment_provider" character varying(50),
    "payment_provider_customer_id" character varying(255),
    "payment_provider_subscription_id" character varying(255),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."store_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid",
    "store_name" character varying(255) NOT NULL,
    "store_slug" character varying(255) NOT NULL,
    "description" "text",
    "logo_url" "text",
    "banner_url" "text",
    "contact_email" character varying(255),
    "contact_phone" character varying(20),
    "business_address" "text",
    "business_license" character varying(100),
    "tax_id" character varying(50),
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "short_description" "text",
    CONSTRAINT "stores_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('approved'::character varying)::"text", ('suspended'::character varying)::"text", ('rejected'::character varying)::"text", ('trial'::character varying)::"text"])))
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_number" character varying(50) NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "store_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "plan_name" character varying(100) NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" character(3) DEFAULT 'BDT'::"bpchar" NOT NULL,
    "billing_cycle" "public"."billing_cycle" NOT NULL,
    "status" "public"."invoice_status" DEFAULT 'unpaid'::"public"."invoice_status" NOT NULL,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "due_date" timestamp with time zone NOT NULL,
    "paid_at" timestamp with time zone,
    "payment_method" character varying(50),
    "payment_reference" character varying(255),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sender_number" "text"
);


ALTER TABLE "public"."subscription_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "slug" character varying(100) NOT NULL,
    "description" "text",
    "price_monthly" numeric(12,2) DEFAULT 0 NOT NULL,
    "price_yearly" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" character(3) DEFAULT 'BDT'::"bpchar" NOT NULL,
    "features" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "limits" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "trial_days" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "avatar_url" "text",
    "date_of_birth" "date",
    "gender" character varying(10),
    "address_line_1" "text",
    "address_line_2" "text",
    "city" character varying(100),
    "state" character varying(100),
    "postal_code" character varying(20),
    "country" character varying(100) DEFAULT 'Bangladesh'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "password_hash" character varying(255) NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "phone" character varying(20),
    "user_type" character varying(20) NOT NULL,
    "email_verified" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "store_id" "uuid",
    CONSTRAINT "users_user_type_check" CHECK ((("user_type")::"text" = ANY (ARRAY[('super_admin'::character varying)::"text", ('store_owner'::character varying)::"text", ('customer'::character varying)::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "product_id" "uuid",
    "variant_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wishlists" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_user_id_store_id_key" UNIQUE ("user_id", "store_id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_profiles"
    ADD CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_us"
    ADD CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_categories"
    ADD CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_subscriptions"
    ADD CONSTRAINT "one_active_per_store" UNIQUE ("store_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_tracking"
    ADD CONSTRAINT "order_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pixel_events"
    ADD CONSTRAINT "pixel_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_inventory"
    ADD CONSTRAINT "product_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_inventory"
    ADD CONSTRAINT "product_inventory_product_id_variant_id_key" UNIQUE ("product_id", "variant_id");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_product_id_customer_id_order_id_key" UNIQUE ("product_id", "customer_id", "order_id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_store_id_slug_key" UNIQUE ("store_id", "slug");



ALTER TABLE ONLY "public"."store_customer_links"
    ADD CONSTRAINT "store_customer_links_customer_id_store_id_key" UNIQUE ("customer_id", "store_id");



ALTER TABLE ONLY "public"."store_customer_links"
    ADD CONSTRAINT "store_customer_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_customers"
    ADD CONSTRAINT "store_customers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."store_customers"
    ADD CONSTRAINT "store_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_reviews"
    ADD CONSTRAINT "store_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_reviews"
    ADD CONSTRAINT "store_reviews_store_id_customer_id_order_id_key" UNIQUE ("store_id", "customer_id", "order_id");



ALTER TABLE ONLY "public"."store_settings"
    ADD CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_social_media"
    ADD CONSTRAINT "store_social_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_social_media"
    ADD CONSTRAINT "store_social_media_unique_store" UNIQUE ("store_id");



ALTER TABLE ONLY "public"."store_subscriptions"
    ADD CONSTRAINT "store_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_store_slug_key" UNIQUE ("store_slug");



ALTER TABLE ONLY "public"."subscription_invoices"
    ADD CONSTRAINT "subscription_invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."subscription_invoices"
    ADD CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_user_id_product_id_variant_id_key" UNIQUE ("user_id", "product_id", "variant_id");



CREATE INDEX "idx_expenses_category_id" ON "public"."expenses" USING "btree" ("category_id");



CREATE INDEX "idx_expenses_date" ON "public"."expenses" USING "btree" ("expense_date");



CREATE INDEX "idx_expenses_user_date" ON "public"."expenses" USING "btree" ("store_id", "expense_date");



CREATE INDEX "idx_expenses_user_id" ON "public"."expenses" USING "btree" ("store_id");



CREATE INDEX "idx_invoices_status" ON "public"."subscription_invoices" USING "btree" ("status");



CREATE INDEX "idx_invoices_store_id" ON "public"."subscription_invoices" USING "btree" ("store_id");



CREATE INDEX "idx_invoices_subscription_id" ON "public"."subscription_invoices" USING "btree" ("subscription_id");



CREATE INDEX "idx_pixel_events_store_created" ON "public"."pixel_events" USING "btree" ("store_id", "created_at" DESC);



CREATE INDEX "idx_store_subscriptions_expires_at" ON "public"."store_subscriptions" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_store_subscriptions_plan_id" ON "public"."store_subscriptions" USING "btree" ("plan_id");



CREATE INDEX "idx_store_subscriptions_status" ON "public"."store_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_store_subscriptions_store_id" ON "public"."store_subscriptions" USING "btree" ("store_id");



CREATE INDEX "idx_store_subscriptions_user_id" ON "public"."store_subscriptions" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_invoice_paid" BEFORE UPDATE ON "public"."subscription_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."sync_subscription_on_invoice_paid"();



CREATE OR REPLACE TRIGGER "trg_store_subscriptions_updated_at" BEFORE UPDATE ON "public"."store_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_subscription_invoices_updated_at" BEFORE UPDATE ON "public"."subscription_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_subscription_plans_updated_at" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."customer_profiles"
    ADD CONSTRAINT "customer_profiles_store_customer_id_fkey" FOREIGN KEY ("store_customer_id") REFERENCES "public"."store_customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_categories"
    ADD CONSTRAINT "expense_categories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_tracking"
    ADD CONSTRAINT "order_tracking_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_tracking"
    ADD CONSTRAINT "order_tracking_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."store_customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pixel_events"
    ADD CONSTRAINT "pixel_events_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_inventory"
    ADD CONSTRAINT "product_inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_inventory"
    ADD CONSTRAINT "product_inventory_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_customer_links"
    ADD CONSTRAINT "store_customer_links_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."store_customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_customer_links"
    ADD CONSTRAINT "store_customer_links_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_customers"
    ADD CONSTRAINT "store_customers_auth_user_id_fkey1" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."store_reviews"
    ADD CONSTRAINT "store_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_reviews"
    ADD CONSTRAINT "store_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."store_reviews"
    ADD CONSTRAINT "store_reviews_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_settings"
    ADD CONSTRAINT "store_settings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_social_media"
    ADD CONSTRAINT "store_social_media_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_subscriptions"
    ADD CONSTRAINT "store_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."store_subscriptions"
    ADD CONSTRAINT "store_subscriptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_subscriptions"
    ADD CONSTRAINT "store_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_invoices"
    ADD CONSTRAINT "subscription_invoices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."subscription_invoices"
    ADD CONSTRAINT "subscription_invoices_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_invoices"
    ADD CONSTRAINT "subscription_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."store_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_invoices"
    ADD CONSTRAINT "subscription_invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;



CREATE POLICY "invoices_owner_read" ON "public"."subscription_invoices" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "invoices_service_write" ON "public"."subscription_invoices" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "owner_read" ON "public"."pixel_events" FOR SELECT USING (("store_id" IN ( SELECT "users"."store_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "plans_public_read" ON "public"."subscription_plans" FOR SELECT USING ((("is_public" = true) AND ("is_active" = true)));



CREATE POLICY "plans_service_write" ON "public"."subscription_plans" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "public_insert" ON "public"."pixel_events" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "stores_select_own" ON "public"."stores" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "subscriptions_owner_read" ON "public"."store_subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "subscriptions_service_write" ON "public"."store_subscriptions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "users_select_own" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_subscription_on_invoice_paid"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_subscription_on_invoice_paid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_subscription_on_invoice_paid"() TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."carts" TO "anon";
GRANT ALL ON TABLE "public"."carts" TO "authenticated";
GRANT ALL ON TABLE "public"."carts" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."contact_us" TO "anon";
GRANT ALL ON TABLE "public"."contact_us" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_us" TO "service_role";



GRANT ALL ON TABLE "public"."customer_profiles" TO "anon";
GRANT ALL ON TABLE "public"."customer_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."expense_categories" TO "anon";
GRANT ALL ON TABLE "public"."expense_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_categories" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_tracking" TO "anon";
GRANT ALL ON TABLE "public"."order_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."order_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."pixel_events" TO "anon";
GRANT ALL ON TABLE "public"."pixel_events" TO "authenticated";
GRANT ALL ON TABLE "public"."pixel_events" TO "service_role";



GRANT ALL ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."product_images" TO "service_role";



GRANT ALL ON TABLE "public"."product_inventory" TO "anon";
GRANT ALL ON TABLE "public"."product_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."product_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."product_reviews" TO "anon";
GRANT ALL ON TABLE "public"."product_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."product_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."store_customer_links" TO "anon";
GRANT ALL ON TABLE "public"."store_customer_links" TO "authenticated";
GRANT ALL ON TABLE "public"."store_customer_links" TO "service_role";



GRANT ALL ON TABLE "public"."store_customers" TO "anon";
GRANT ALL ON TABLE "public"."store_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."store_customers" TO "service_role";



GRANT ALL ON TABLE "public"."store_reviews" TO "anon";
GRANT ALL ON TABLE "public"."store_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."store_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."store_settings" TO "anon";
GRANT ALL ON TABLE "public"."store_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."store_settings" TO "service_role";



GRANT ALL ON TABLE "public"."store_social_media" TO "anon";
GRANT ALL ON TABLE "public"."store_social_media" TO "authenticated";
GRANT ALL ON TABLE "public"."store_social_media" TO "service_role";



GRANT ALL ON TABLE "public"."store_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."store_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."store_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_invoices" TO "anon";
GRANT ALL ON TABLE "public"."subscription_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."wishlists" TO "anon";
GRANT ALL ON TABLE "public"."wishlists" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlists" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







