-- Fixes stored image URLs after a Supabase project migration.
--
-- Context: the project was migrated from the old Supabase project
-- (tzmrxxtrkwehdgzeyhgq.supabase.co, now deleted -- its hostname no longer
-- resolves) to the current one (sqvvtaejcfarmxcdvgrz.supabase.co). Storage
-- objects were copied over under the same bucket/path, but these text
-- columns still had the old hostname baked into the stored URL, so every
-- image referencing it 404s.
--
-- Verified before first running this: swapping just the hostname on a
-- broad sample of stored URLs (product images across multiple products,
-- plus all three stores' logo/banner URLs) resolved with HTTP 200 against
-- the new project, confirming the same bucket/path exists there.
-- categories.image_url, customer_profiles.avatar_url, and
-- user_profiles.avatar_url had zero rows on the old host, so they're not
-- included below -- add an UPDATE block for them the same way if that ever
-- changes.
--
-- Reusable for the next project migration: just change old_host/new_host
-- below and re-run. Safe to copy-paste and run again anytime -- the WHERE
-- clause only ever matches rows still pointing at old_host, so it's a
-- no-op once nothing does.

DO $$
DECLARE
  old_host CONSTANT text := 'https://tzmrxxtrkwehdgzeyhgq.supabase.co';
  new_host CONSTANT text := 'https://sqvvtaejcfarmxcdvgrz.supabase.co';
  updated_count integer;
BEGIN
  UPDATE "public"."product_images"
  SET "image_url" = replace("image_url", old_host, new_host)
  WHERE "image_url" LIKE '%' || old_host || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'product_images.image_url rows updated: %', updated_count;

  UPDATE "public"."stores"
  SET "logo_url" = replace("logo_url", old_host, new_host)
  WHERE "logo_url" LIKE '%' || old_host || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'stores.logo_url rows updated: %', updated_count;

  UPDATE "public"."stores"
  SET "banner_url" = replace("banner_url", old_host, new_host)
  WHERE "banner_url" LIKE '%' || old_host || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'stores.banner_url rows updated: %', updated_count;
END $$;
