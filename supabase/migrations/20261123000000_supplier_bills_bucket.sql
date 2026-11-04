-- Private bucket for photos of paper supplier bills.
--
-- Each photo is saved as <store_id>/<random id>.webp and its path is kept on the purchase
-- (purchases.attachment_url). The bucket is private: the app shows a photo through a short-lived
-- signed link, and only for people who have the supplier bills permission.
--
-- If your storage schema rejects the statement below, create a PRIVATE bucket named
-- "supplier-bills" in Studio instead. Without the bucket, bills save as before and only the photo
-- upload fails with a clear message.
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('supplier-bills', 'supplier-bills', false)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create the supplier-bills bucket (%). Create it in Studio as a private bucket.', SQLERRM;
END $$;
