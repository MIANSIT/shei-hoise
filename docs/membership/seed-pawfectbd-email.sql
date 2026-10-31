-- Gives PawfectBD its own welcome email wording, exactly as in
-- PawfectBD_Welcome_Email_Gmail_Ready.html (colours, lines, subject).
-- Run it once in Supabase Studio AFTER applying migration 20261111, then upload the
-- card picture in the dashboard: Memberships -> "Card & email".
--
-- Change 'pawfectbd' to your store's slug if it is different.
INSERT INTO "public"."membership_card_designs" ("store_id", "email_enabled", "email_brand")
SELECT
  s."id",
  true,
  jsonb_build_object(
    'storeName', 'PawfectBD',
    'tagline', 'WE CARE FOR YOUR PETS.',
    'programName', 'Pawfect Pet Parent Membership Program',
    'heroLine', 'Your VIP Pawfect Pet Parent membership starts here 🐾',
    'emoji', '🐾',
    'introLine', 'Your love and care for your furry companions deserve something special, and we''re excited to make your pet-parenting journey even more rewarding.',
    'thanksLine', 'Thank you for being a part of our journey. We look forward to serving you and making every moment with your furry family even more special.',
    'closingLine', 'More Care. More Savings. More Happy Paws. 🐾',
    'cardHeading', 'YOUR VIP MEMBERSHIP CARD',
    'subject', 'Welcome to the PawfectBD Family, {name}! Your VIP membership card',
    'colorPrimary', '#f45549',
    'colorDeep', '#07543b',
    'colorGold', '#d9a441'
  )
FROM "public"."stores" s
WHERE s."store_slug" = 'pawfectbd'
ON CONFLICT ("store_id") DO UPDATE
  SET "email_brand" = EXCLUDED."email_brand", "updated_at" = now();

-- Where the name and the number go on the card picture you showed me (1375 x 810),
-- for reference when you drag the two boxes in the "Card & email" tab:
--   Name box    x 124, y 362, width 560, height 84   (deep green, Lora Bold, left)
--   Number box  x 225, y 548, width 300, height 48   (deep green, Lora Bold, left)
