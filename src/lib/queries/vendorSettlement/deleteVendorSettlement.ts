"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Undoes a mistakenly-recorded settlement — reverses the stock it moved
// (both sold and returned quantities go back to the vendor's pool; the
// returned portion also comes back out of the warehouse) and removes the
// settlement and any payment logged alongside it.
// See supabase/migrations/20260823000006_add_delete_vendor_settlement_rpc.sql.
//
// The RPC deliberately refuses to delete (and rolls back entirely) when the
// warehouse stock it would need to claw back has already moved elsewhere —
// that's a safety check, not a bug, but its raised message names the product
// by raw UUID, which reads as a cryptic failure rather than an explanation.
// Swap the UUID for the product's actual name before it reaches the owner.
async function humanizeError(message: string): Promise<string> {
  const match = message.match(/for product ([0-9a-f-]{36})/i);
  if (!match) return message;
  const { data } = await supabaseAdmin
    .from("products")
    .select("name")
    .eq("id", match[1])
    .maybeSingle();
  if (!data?.name) return message;
  return message.replace(match[0], `for "${data.name}"`);
}

export async function deleteVendorSettlement(
  settlementId: string,
  storeId: string,
  deletedBy?: string | null,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("delete_vendor_settlement", {
    p_settlement_id: settlementId,
    p_caller_store_id: storeId,
    p_deleted_by: deletedBy || null,
  });

  if (error) throw new Error(await humanizeError(error.message));
}
