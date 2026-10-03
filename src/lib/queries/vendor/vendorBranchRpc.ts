import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Calls a vendor RPC through its *_at_branch wrapper (stores with branches:
 * stock and money move in one branch — see
 * supabase/migrations/20261005000000_add_vendor_branches.sql), falling back
 * to the original function when the wrapper isn't in the database yet.
 * Server-only: uses the service role.
 * @param name - the original RPC name, e.g. "confirm_vendor_order"
 * @param args - the original RPC's arguments
 * @param branchArgs - extra arguments only the wrapper takes (e.g. p_branch_id)
 * @returns the RPC's data and error, as supabase returns them
 */
export async function callVendorRpc<T = unknown>(
  name: string,
  args: Record<string, unknown>,
  branchArgs: Record<string, unknown> = {},
): Promise<{ data: T | null; error: { message: string; code?: string } | null }> {
  const atBranch = await supabaseAdmin.rpc(`${name}_at_branch`, { ...args, ...branchArgs });
  // PGRST202: function not found (migration not applied yet).
  if (atBranch.error?.code === "PGRST202") {
    const original = await supabaseAdmin.rpc(name, args);
    return { data: (original.data as T) ?? null, error: original.error };
  }
  return { data: (atBranch.data as T) ?? null, error: atBranch.error };
}
