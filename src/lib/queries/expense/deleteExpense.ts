import { supabase } from "@/lib/supabase";

export async function deleteExpense(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      console.error("Error deleting expense:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Exception in deleteExpense:", err);
    return false;
  }
}