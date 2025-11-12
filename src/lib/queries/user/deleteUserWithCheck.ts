import { supabase } from "@/lib/supabase";

interface DeleteResult {
  success: boolean;
  message: string;
}

// interface SupabaseSession {
//   user: { id: string };
// }

interface UserRecord {
  id: string;
  user_type?: string;
}

interface OrderRecord {
  id: string;
}

/**
 * Deletes a user and their profile only if they have no existing orders.
 * Blocks deletion if the user has placed any orders.
 */
export async function deleteUserWithCheck(
  userId: string
): Promise<DeleteResult> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) return { success: false, message: sessionError.message };
    if (!session)
      return {
        success: false,
        message: "You must be logged in to delete a user.",
      };

    const { data: currentUser, error: userTypeError } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", session.user.id)
      .single<UserRecord>();

    if (userTypeError)
      return { success: false, message: userTypeError.message };

    // Allow both admin and store_owner
    if (
      currentUser?.user_type !== "admin" &&
      currentUser?.user_type !== "store_owner"
    ) {
      return {
        success: false,
        message: "You don’t have permission to delete users.",
      };
    }

    const { data: targetUser, error: userFetchError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single<UserRecord>();

    if (userFetchError || !targetUser) {
      return {
        success: false,
        message: "The user you are trying to delete does not exist.",
      };
    }

    const { data: existingOrders, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_id", userId)
      .limit(1)
      .returns<OrderRecord[]>();

    if (orderError) {
      return {
        success: false,
        message: "Failed to check user orders. Please try again.",
      };
    }

    if (existingOrders && existingOrders.length > 0) {
      return {
        success: false,
        message:
          "This user cannot be deleted because they have existing orders.",
      };
    }

    await supabase.from("user_profiles").delete().eq("user_id", userId);
    await supabase.from("users").delete().eq("id", userId);

    return { success: true, message: "User deleted successfully." };
  } catch (error) {
    const err =
      error instanceof Error ? error.message : "Unknown error occurred";
    return { success: false, message: err };
  }
}
