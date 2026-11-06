-- Hero slide: optional separate (taller) image for phones.
-- NULL means phones use the normal slide image, as before.
ALTER TABLE "public"."store_hero_slides"
  ADD COLUMN IF NOT EXISTS "mobile_image_url" text;
