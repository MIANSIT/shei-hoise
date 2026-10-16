-- Facebook ads connection (Meta Marketing API) for the Pixel Analytics page.
--
-- A store owner can paste their ad account id and a Marketing API access token
-- (read-only "ads_read") so the dashboard can show ad spend, reach, clicks and
-- ROAS next to the store's own tracked sales.
--
-- Both columns are nullable, so existing stores and running code are untouched.
-- The token is stored encrypted (same AES-GCM scheme as
-- facebook_capi_access_token) and is never sent back to the browser.

ALTER TABLE "public"."store_settings"
  ADD COLUMN IF NOT EXISTS "facebook_ad_account_id" character varying,
  ADD COLUMN IF NOT EXISTS "facebook_ads_access_token" "text";

COMMENT ON COLUMN "public"."store_settings"."facebook_ad_account_id" IS
  'Meta ad account id, digits only (without the act_ prefix). Used to read ad insights.';
COMMENT ON COLUMN "public"."store_settings"."facebook_ads_access_token" IS
  'Encrypted Meta Marketing API token (ads_read). Server-side only; never returned to the client.';
