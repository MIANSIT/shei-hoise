"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CreateVendorPaymentInput, VendorPayment } from "@/lib/types/vendor/type";

// Records cash collected from a vendor with no product breakdown required —
// a pure ledger entry against the vendor. Record Settlement stays for
// genuine sold/returned reconciliation; this is the fast path for "the
// vendor just handed over money." No RPC needed: unlike a settlement, a
// standalone payment has no stock or receivable side effects.
export async function createVendorPayment(
  input: CreateVendorPaymentInput,
): Promise<VendorPayment> {
  if (!(input.amount > 0)) {
    throw new Error("Payment amount must be greater than zero");
  }

  const { data, error } = await supabaseAdmin
    .from("vendor_payments")
    .insert({
      store_id: input.store_id,
      vendor_id: input.vendor_id,
      amount: input.amount,
      payment_date: input.payment_date,
      payment_method: input.payment_method,
      notes: input.notes || null,
      created_by: input.created_by || null,
      vendor_order_id: input.vendor_order_id || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return data as VendorPayment;
}
