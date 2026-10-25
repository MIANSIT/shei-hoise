"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore, logActivity } from "@/lib/permissions/server";
import type { Supplier, SupplierInput, SupplierResult } from "./supplierTypes";

const MAX_ASSIGN = 300;

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Enter the supplier's name").max(80, "Name is too long"),
  phone: z.string().trim().max(30, "Phone number is too long").optional(),
  email: z.string().trim().max(120, "Email is too long").optional(),
  address: z.string().trim().max(200, "Address is too long").optional(),
  notes: z.string().trim().max(500, "Notes are too long").optional(),
});

interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
}

function clean(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

/**
 * The store's suppliers, with how many products use each as their default.
 * @returns the list, or an empty list when not allowed or on failure
 */
export async function getSuppliers(storeId: string): Promise<Supplier[]> {
  try {
    const auth = await authorizeForStore(storeId, "stock.view");
    if (!auth.ok) return [];

    const [suppliersRes, productsRes] = await Promise.all([
      supabaseAdmin
        .from("suppliers")
        .select("id, name, phone, email, address, notes, is_active")
        .eq("store_id", storeId)
        .order("name"),
      supabaseAdmin.from("products").select("supplier_id").eq("store_id", storeId).not("supplier_id", "is", null).limit(100000),
    ]);
    if (suppliersRes.error) throw new Error(suppliersRes.error.message);

    const counts = new Map<string, number>();
    for (const row of (productsRes.data ?? []) as { supplier_id: string }[]) {
      counts.set(row.supplier_id, (counts.get(row.supplier_id) ?? 0) + 1);
    }

    return ((suppliersRes.data ?? []) as SupplierRow[]).map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      notes: s.notes,
      isActive: s.is_active,
      productCount: counts.get(s.id) ?? 0,
    }));
  } catch (error) {
    console.error("getSuppliers failed:", error);
    return [];
  }
}

/**
 * Which supplier each product uses (product id → supplier id). Read on its
 * own, and empty on any failure, so the stock list keeps working even before
 * the suppliers migration has been applied.
 * @returns a plain object map; products without a supplier are absent
 */
export async function getProductSupplierMap(storeId: string): Promise<Record<string, string>> {
  try {
    const auth = await authorizeForStore(storeId, "stock.view");
    if (!auth.ok) return {};
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, supplier_id")
      .eq("store_id", storeId)
      .not("supplier_id", "is", null)
      .limit(100000);
    if (error) return {};
    const map: Record<string, string> = {};
    for (const row of (data ?? []) as { id: string; supplier_id: string }[]) map[row.id] = row.supplier_id;
    return map;
  } catch {
    return {};
  }
}

/**
 * Adds a supplier.
 * @returns success, or the first thing wrong with the input
 */
export async function createSupplier(storeId: string, input: SupplierInput): Promise<SupplierResult> {
  try {
    const auth = await authorizeForStore(storeId, "stock.edit");
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = supplierSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    const { data, error } = await supabaseAdmin
      .from("suppliers")
      .insert({
        store_id: storeId,
        name: v.name,
        phone: clean(v.phone),
        email: clean(v.email),
        address: clean(v.address),
        notes: clean(v.notes),
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "stock.supplier",
      entityType: "supplier",
      entityId: data?.id ?? null,
      summary: `Added supplier ${v.name}`,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add supplier" };
  }
}

/**
 * Changes a supplier's details.
 * @returns success, or why it failed
 */
export async function updateSupplier(storeId: string, supplierId: string, input: SupplierInput): Promise<SupplierResult> {
  try {
    const auth = await authorizeForStore(storeId, "stock.edit");
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = supplierSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
    const v = parsed.data;

    const { data, error } = await supabaseAdmin
      .from("suppliers")
      .update({
        name: v.name,
        phone: clean(v.phone),
        email: clean(v.email),
        address: clean(v.address),
        notes: clean(v.notes),
        updated_at: new Date().toISOString(),
      })
      .eq("id", supplierId)
      .eq("store_id", storeId)
      .select("id")
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Supplier not found" };

    await logActivity(auth.actor, {
      action: "stock.supplier",
      entityType: "supplier",
      entityId: supplierId,
      summary: `Updated supplier ${v.name}`,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update supplier" };
  }
}

/**
 * Removes a supplier. Products that used it are left with no supplier.
 * @returns success, or why it failed
 */
export async function deleteSupplier(storeId: string, supplierId: string): Promise<SupplierResult> {
  try {
    const auth = await authorizeForStore(storeId, "stock.edit");
    if (!auth.ok) return { success: false, error: auth.error };

    const { data: existing } = await supabaseAdmin
      .from("suppliers")
      .select("name")
      .eq("id", supplierId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!existing) return { success: false, error: "Supplier not found" };

    const { error } = await supabaseAdmin.from("suppliers").delete().eq("id", supplierId).eq("store_id", storeId);
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "stock.supplier",
      entityType: "supplier",
      entityId: supplierId,
      summary: `Deleted supplier ${existing.name}`,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete supplier" };
  }
}

/**
 * Sets (or clears, with null) the default supplier of many products at once.
 * Both the products and the supplier must belong to the caller's store.
 * @returns success, or why it failed
 */
export async function assignSupplierToProducts(
  storeId: string,
  productIds: string[],
  supplierId: string | null,
): Promise<SupplierResult> {
  try {
    const auth = await authorizeForStore(storeId, "stock.edit");
    if (!auth.ok) return { success: false, error: auth.error };

    const ids = z.array(z.string().uuid()).min(1).max(MAX_ASSIGN).safeParse(productIds);
    if (!ids.success) return { success: false, error: "Choose at least one product" };

    let supplierName = "no supplier";
    if (supplierId) {
      const { data: supplier } = await supabaseAdmin
        .from("suppliers")
        .select("name")
        .eq("id", supplierId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (!supplier) return { success: false, error: "Supplier not found" };
      supplierName = supplier.name;
    }

    const { error } = await supabaseAdmin
      .from("products")
      .update({ supplier_id: supplierId })
      .in("id", ids.data)
      .eq("store_id", storeId);
    if (error) return { success: false, error: error.message };

    await logActivity(auth.actor, {
      action: "stock.supplier",
      entityType: "product",
      summary: `Set supplier to ${supplierName} for ${ids.data.length} product${ids.data.length === 1 ? "" : "s"}`,
      details: { supplier_id: supplierId, product_count: ids.data.length },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to assign supplier" };
  }
}
