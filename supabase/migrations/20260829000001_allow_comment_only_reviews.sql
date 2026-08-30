-- A star rating now requires a verified purchase — without one, a logged-in
-- customer can still leave a text comment, just no rating, so a product's
-- average can't be moved by anyone who hasn't actually bought it. rating
-- must become nullable to allow that; the existing 1-5 CHECK constraint
-- already permits NULL on its own (CHECK passes vacuously for NULL), only
-- the NOT NULL needs dropping.

ALTER TABLE ONLY "public"."product_reviews" ALTER COLUMN "rating" DROP NOT NULL;
