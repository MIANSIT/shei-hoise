-- Public bucket for the member cards shown inside welcome emails.
--
-- A picture attached to an email can be missed by some mail apps (Gmail listed
-- the card as an attachment but did not draw it in the message). Pointing the
-- email at the card's own web address works in every mail app, so each member's
-- card is saved here as <store_id>/<membership_id>.png and removed when the
-- membership is. The address contains the membership's random id, so it cannot
-- be guessed; the card shows only the member's name and membership number.
--
-- The store's blank card (the master picture) stays in the private
-- "membership-cards" bucket from 20261111. If your storage schema rejects the
-- statement below, create a PUBLIC bucket named "membership-card-images" in
-- Studio instead. Without the bucket, emails still go out with the card attached
-- inline, as before.
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('membership-card-images', 'membership-card-images', true)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create the membership-card-images bucket (%). Create it in Studio as a public bucket.', SQLERRM;
END $$;
