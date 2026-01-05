import { supabase } from "@/lib/supabase";

export async function updateInventory({
  product_id,
  variant_id = null,
  quantity_available,
}: {
  product_id: string;
  variant_id?: string | null;
  quantity_available: number;
}) {
  let query = supabase
    .from("product_inventory")
    .update({ quantity_available, updated_at: new Date().toISOString() })
    .eq("product_id", product_id);

  if (variant_id) {
    query = query.eq("variant_id", variant_id);
  } else {
    query = query.is("variant_id", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to update inventory:", error);
  } else {
    
  }

  return data;
}
