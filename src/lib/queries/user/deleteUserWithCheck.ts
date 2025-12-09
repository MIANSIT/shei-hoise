import { supabase } from "@/lib/supabase";

interface DeleteResult {
  success: boolean;
  message: string;
}

export async function deleteUserWithCheck(
  customerId: string,
  storeId: string
): Promise<DeleteResult> {
  try {
    // 1. Must be logged in
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) return { success: false, message: sessionError.message };
    if (!session) return { success: false, message: "You must be logged in." };

    // 2. Check if customer exists
    const { data: customer, error: customerError } = await supabase
      .from("store_customers")
      .select("id")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return { success: false, message: "Customer not found." };
    }

    // 3. Must be linked to this store
    const { data: link, error: linkError } = await supabase
      .from("store_customer_links")
      .select("id")
      .eq("customer_id", customerId)
      .eq("store_id", storeId)
      .single();

    if (linkError || !link) {
      return {
        success: false,
        message:
          "You cannot delete this customer because they are not linked to your store.",
      };
    }

    // 4. Check if customer has existing orders
    const { data: orders, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_id", customerId)
      .eq("store_id", storeId)
      .limit(1);

    if (orderError) {
      return { success: false, message: "Failed to check orders." };
    }

    if (orders && orders.length > 0) {
      return {
        success: false,
        message:
          "You cannot delete this customer because they have existing orders.",
      };
    }

    // 5. Delete profile
    await supabase
      .from("customer_profiles")
      .delete()
      .eq("store_customer_id", customerId);

    // 6. Delete customer-store link
    await supabase
      .from("store_customer_links")
      .delete()
      .eq("customer_id", customerId)
      .eq("store_id", storeId);

    // 7. Delete customer
    await supabase.from("store_customers").delete().eq("id", customerId);

    return { success: true, message: "Customer deleted successfully." };
  } catch (error) {
    const err = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: err };
  }
}
