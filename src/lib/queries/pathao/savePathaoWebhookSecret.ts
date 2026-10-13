"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/utils/encryption";
import { getOwnerStoreId } from "@/lib/permissions/server";

export interface SavePathaoWebhookSecretResult {
  success: boolean;
  error?: string;
}

const MIN_SECRET_LENGTH = 8;
const MAX_SECRET_LENGTH = 200;

/**
 * Saves the secret Pathao's own panel shows for the webhook. Pathao checks the
 * webhook by asking us to send that exact value back, so it has to replace the
 * one we generated when Pathao supplies its own.
 */
export async function savePathaoWebhookSecret(
  credentialId: string,
  secret: string,
): Promise<SavePathaoWebhookSecretResult> {
  try {
    const storeResult = await getOwnerStoreId();
    if (!storeResult.ok) {
      return { success: false, error: storeResult.error };
    }

    const trimmed = secret.trim();
    if (trimmed.length < MIN_SECRET_LENGTH || trimmed.length > MAX_SECRET_LENGTH || /\s/.test(trimmed)) {
      return { success: false, error: "Paste the secret exactly as Pathao shows it, with no spaces." };
    }

    const { data, error } = await supabaseAdmin
      .from("store_courier_credentials")
      .update({ webhook_secret: encrypt(trimmed), updated_at: new Date().toISOString() })
      .eq("id", credentialId)
      .eq("store_id", storeResult.storeId)
      .eq("courier", "pathao")
      .select("id")
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    if (!data) {
      return { success: false, error: "This Pathao account was not found" };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save the secret" };
  }
}
