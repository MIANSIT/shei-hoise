-- Give confirmed vendor orders (and settlements) that still have no branch the
-- default branch.
--
-- 20261005000000 did this once, but a vendor order confirmed afterwards without
-- a branch stayed unassigned. "All branches" counts every vendor order while a
-- branch counts only its own, so an unassigned one (৳9,710 on one store) showed
-- in the store-wide Sales and To collect and in no branch. Same rule as the
-- original backfill, and only for stores that have branches. Idempotent.

UPDATE public.vendor_orders vo
   SET branch_id = public.default_store_branch(vo.store_id)
 WHERE vo.branch_id IS NULL AND vo.status <> 'draft'
   AND EXISTS (SELECT 1 FROM public.store_branches b WHERE b.store_id = vo.store_id);

UPDATE public.vendor_settlements vs
   SET branch_id = public.default_store_branch(vs.store_id)
 WHERE vs.branch_id IS NULL
   AND EXISTS (SELECT 1 FROM public.store_branches b WHERE b.store_id = vs.store_id);
