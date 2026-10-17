-- Hero slide button: where it sits on the banner and whether its link opens in a new tab.
-- NULL position keeps the old behaviour (button under the headline/subtext).
ALTER TABLE "public"."store_hero_slides"
  ADD COLUMN IF NOT EXISTS "button_position" text,
  ADD COLUMN IF NOT EXISTS "button_new_tab" boolean DEFAULT false NOT NULL;

ALTER TABLE "public"."store_hero_slides"
  DROP CONSTRAINT IF EXISTS "store_hero_slides_button_position_check";
ALTER TABLE "public"."store_hero_slides"
  ADD CONSTRAINT "store_hero_slides_button_position_check" CHECK (
    "button_position" IS NULL OR "button_position" IN (
      'top-left', 'top-center', 'top-right',
      'middle-left', 'middle-center', 'middle-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    )
  );
