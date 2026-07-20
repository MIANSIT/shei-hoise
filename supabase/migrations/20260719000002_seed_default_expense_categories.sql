-- Seeds the standard "real cost" category set (see defaultExpenseCategories.ts,
-- kept in sync with this list) for every store that doesn't already have a
-- category of that name. New stores get these automatically going forward
-- via createStoreWithSettings.ts — this is the one-time catch-up for stores
-- that already existed before that. Idempotent: safe to re-run, since it
-- only inserts rows that don't already exist for a given store.

INSERT INTO "public"."expense_categories"
  ("store_id", "name", "description", "icon", "color", "is_default", "is_active")
SELECT s."id", cat.name, cat.description, cat.icon, cat.color, true, true
FROM "public"."stores" s
CROSS JOIN (VALUES
  ('Product Purchase', 'What you paid to restock — the base cost of what''s on the shelf.', 'package', '#1e6f57'),
  ('Delivery Shortfall', 'The gap between what you charge for shipping and what the courier actually bills.', 'truck', '#b23b2e'),
  ('Marketing & Ads', 'Facebook/Google ad spend, boosted posts, influencer payments.', 'megaphone', '#33566a'),
  ('Packaging', 'Poly bags, boxes, tape, printed labels — the physical cost of sending an order out.', 'box', '#9a6b1e'),
  ('Staff & Salary', 'Wages for anyone helping run the store — packing, support, delivery pickup.', 'users', '#6d28d9'),
  ('Platform & Software', 'This subscription, payment gateway fees, domain, hosting — the tools that run the business.', 'monitor', '#0891b2'),
  ('Rent & Utilities', 'Shop or warehouse space, electricity, internet — costs that exist whether or not you sell anything that day.', 'home', '#a16207'),
  ('Other', 'Anything real that doesn''t fit above — but titled specifically, not filed away as misc and forgotten.', 'folder', '#57685f')
) AS cat(name, description, icon, color)
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."expense_categories" ec
  WHERE ec."store_id" = s."id" AND ec."name" = cat.name
);
