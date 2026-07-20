-- Backfill for 20260719000008_track_vendor_order_upfront_payment.sql.
--
-- confirm_vendor_order only started inserting a vendor_payments row for the
-- upfront/advance paid_amount as of that migration. Vendor orders confirmed
-- before it carry a paid_amount on the vendor_orders row with no matching
-- vendor_payments row, so their current_due (total_receivable - total_paid)
-- is overstated by exactly that amount. This is a one-time reconciliation:
-- insert the missing payment for every already-confirmed order.
--
-- Idempotent / safe to re-run: the NOT EXISTS guard matches on the same
-- (store_id, vendor_id, notes) shape confirm_vendor_order now writes at
-- confirm time, so orders confirmed after the fix (which already have their
-- payment row) are skipped automatically.
INSERT INTO public.vendor_payments
  (store_id, vendor_id, amount, payment_date, notes, created_by)
SELECT
  vo.store_id,
  vo.vendor_id,
  vo.paid_amount,
  vo.order_date,
  'Upfront payment - ' || vo.invoice_number,
  vo.created_by
FROM public.vendor_orders vo
WHERE vo.status = 'confirmed'
  AND vo.paid_amount > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.vendor_payments vp
    WHERE vp.store_id = vo.store_id
      AND vp.vendor_id = vo.vendor_id
      AND vp.notes = 'Upfront payment - ' || vo.invoice_number
  );
