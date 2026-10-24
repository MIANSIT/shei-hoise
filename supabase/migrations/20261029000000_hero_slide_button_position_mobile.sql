-- Hero slide button: optional separate position for phones.
-- NULL means phones use the same position as desktop ("button_position").
ALTER TABLE "public"."store_hero_slides"
  ADD COLUMN IF NOT EXISTS "button_position_mobile" text;

ALTER TABLE "public"."store_hero_slides"
  DROP CONSTRAINT IF EXISTS "store_hero_slides_button_position_mobile_check";
ALTER TABLE "public"."store_hero_slides"
  ADD CONSTRAINT "store_hero_slides_button_position_mobile_check" CHECK (
    "button_position_mobile" IS NULL OR "button_position_mobile" IN (
      'top-left', 'top-center', 'top-right',
      'middle-left', 'middle-center', 'middle-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    )
  );
