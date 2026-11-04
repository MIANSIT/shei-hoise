"use server";

import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeForStore, logActivity } from "@/lib/permissions/server";
import { optimizeImage } from "@/lib/utils/optimizeImage";

/** Photos of paper supplier bills: private storage, shown through short-lived signed links. */
const BUCKET = "supplier-bills";
const MAX_BYTES = 12 * 1024 * 1024;
const PERMISSION = "stock.supplier_money";
/** How long a signed link to a photo works, in seconds. */
const LINK_SECONDS = 60 * 60;

export type BillPhotoResult = { success: true; path: string } | { success: false; error: string };
export type BillPhotoUrlResult = { success: true; url: string } | { success: false; error: string };
export type BillPhotoAttachResult = { success: true } | { success: false; error: string };

/** A stored path is only ever one of this store's own files. */
const isOwnPath = (storeId: string, path: string) => path.startsWith(`${storeId}/`) && !path.includes("..");

/**
 * Saves a photo of a paper bill (resized to a small WebP). Send the file as form data under "file".
 * @returns the stored path to keep on the purchase, or why it failed
 */
export async function uploadBillPhoto(storeId: string, formData: FormData): Promise<BillPhotoResult> {
  try {
    const auth = await authorizeForStore(storeId, PERMISSION);
    if (!auth.ok) return { success: false, error: auth.error };

    const file = formData.get("file");
    if (!(file instanceof File)) return { success: false, error: "Choose a photo" };
    if (!file.type.startsWith("image/")) return { success: false, error: "Choose an image file (a photo of the bill)" };
    if (file.size > MAX_BYTES) return { success: false, error: "That photo is too large. Use one under 12 MB." };

    const bytes = await optimizeImage(await file.arrayBuffer());
    const path = `${storeId}/${randomUUID()}.webp`;
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (error) {
      return { success: false, error: error.message.toLowerCase().includes("bucket") ? "Photo storage is not set up yet. Ask for the supplier-bills bucket to be created." : error.message };
    }
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the photo" };
  }
}

/**
 * Attaches an uploaded photo to an existing purchase (replacing an earlier one).
 * @returns success, or why it failed
 */
export async function attachBillPhoto(storeId: string, purchaseId: string, path: string): Promise<BillPhotoAttachResult> {
  try {
    const auth = await authorizeForStore(storeId, PERMISSION);
    if (!auth.ok) return { success: false, error: auth.error };
    if (!isOwnPath(storeId, path)) return { success: false, error: "That photo does not belong to this store" };

    const { data: existing } = await supabaseAdmin
      .from("purchases")
      .select("id, attachment_url")
      .eq("id", purchaseId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!existing) return { success: false, error: "Bill not found" };

    const { error } = await supabaseAdmin.from("purchases").update({ attachment_url: path }).eq("id", purchaseId).eq("store_id", storeId);
    if (error) return { success: false, error: error.message };

    // The replaced photo is no longer needed.
    const old = (existing as { attachment_url: string | null }).attachment_url;
    if (old && old !== path && isOwnPath(storeId, old)) await supabaseAdmin.storage.from(BUCKET).remove([old]);

    await logActivity(auth.actor, {
      action: "stock.supplier",
      entityType: "purchase",
      entityId: purchaseId,
      summary: "Attached a photo to a supplier bill",
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to attach the photo" };
  }
}

/**
 * A short-lived link to see a bill photo.
 * @returns the link, or why it could not be made
 */
export async function getBillPhotoUrl(storeId: string, path: string): Promise<BillPhotoUrlResult> {
  try {
    const auth = await authorizeForStore(storeId, PERMISSION);
    if (!auth.ok) return { success: false, error: auth.error };
    if (!isOwnPath(storeId, path)) return { success: false, error: "That photo does not belong to this store" };

    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS);
    if (error || !data) return { success: false, error: error?.message ?? "The photo could not be opened" };
    return { success: true, url: data.signedUrl };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "The photo could not be opened" };
  }
}
