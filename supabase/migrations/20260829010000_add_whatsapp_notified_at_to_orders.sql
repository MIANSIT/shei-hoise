-- Tracks when a store owner last used the "Notify via WhatsApp" click-to-chat
-- button on an order, so the dashboard can show whether it's already been
-- done instead of leaving that state only in the browser tab that clicked it.
ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "whatsapp_notified_at" timestamp with time zone;
