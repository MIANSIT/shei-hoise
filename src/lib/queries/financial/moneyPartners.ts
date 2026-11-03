"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStoreAny, logActivity, requireOwner } from "@/lib/permissions/server";
import type { CreatePartnerInput, CreatePartnerResult, MoneyPartner } from "./moneyPartnerTypes";

const createSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(80, "Name is too long"),
  kind: z.enum(["owner", "investor"]),
});

/**
 * The owner and investors who can pay for the business, for the "who paid" choice
 * on expenses and supplier payments. Anyone who can enter those can pick from the list.
 * @returns the partners by name, or an empty list when not allowed or on failure
 */
export async function listMoneyPartners(storeId: string): Promise<MoneyPartner[]> {
  try {
    const auth = await authorizeForStoreAny(storeId, ["expenses.add", "expenses.edit", "stock.supplier_money"]);
    if (!auth.ok) return [];
    const { data, error } = await supabaseAdmin
      .from("money_partners")
      .select("id, name, kind")
      .eq("store_id", storeId)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as MoneyPartner[];
  } catch (error) {
    console.error("listMoneyPartners failed:", error);
    return [];
  }
}

/**
 * Adds the owner or an investor to the list. Only the store owner can add one.
 * @returns the new partner, or why it failed
 */
export async function createMoneyPartner(storeId: string, input: CreatePartnerInput): Promise<CreatePartnerResult> {
  try {
    const auth = await requireOwner({ storeId });
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = createSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the name" };

    const { data, error } = await supabaseAdmin
      .from("money_partners")
      .insert({ store_id: storeId, name: parsed.data.name, kind: parsed.data.kind })
      .select("id, name, kind")
      .single();
    if (error) {
      if (error.code === "23505") return { success: false, error: "Someone with that name is already on the list" };
      return { success: false, error: error.message };
    }

    await logActivity(auth.actor, {
      action: "money.partner_add",
      entityType: "money_partner",
      entityId: data.id,
      summary: `Added ${parsed.data.kind === "owner" ? "owner" : "investor"} ${parsed.data.name}`,
    });
    return { success: true, partner: data as MoneyPartner };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add" };
  }
}
