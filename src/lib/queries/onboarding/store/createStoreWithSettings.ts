// lib/queries/onboarding/store/createStoreWithSettings.ts
"use server";

import { supabase, supabaseAdmin } from "@/lib/supabase";
import {
  StoreType,
  StoreSettingsType,
} from "@/lib/schema/onboarding/user.schema";

type CreateStoreArgs = {
  ownerId: string;
  store: StoreType;
  settings?: StoreSettingsType;
};

/**
 * Production-safe store creation.
 * Rollback is handled in the calling action (createUser),
 * so this function only throws on errors.
 */
export async function createStoreWithSettings({
  ownerId,
  store,
  settings,
}: CreateStoreArgs) {
  let storeId: string | null = null;
  const uploadedFiles: { bucket: string; path: string }[] = [];

  try {
    // 1️⃣ Insert store
    const { data, error } = await supabase
      .from("stores")
      .insert({
        owner_id: ownerId,
        ...store,
        logo_url: typeof store.logo_url === "string" ? store.logo_url : null,
        banner_url:
          typeof store.banner_url === "string" ? store.banner_url : null,
      })
      .select("id")
      .single();

    if (error) throw error;
    storeId = data.id;

    const uploads: Partial<Pick<StoreType, "logo_url" | "banner_url">> = {};
    const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // 2️⃣ Upload logo if it's a file
    if (store.logo_url instanceof File) {
      const path = `store/${storeId}/logo-${uniqueId}.png`;
      await supabaseAdmin.storage
        .from("store_logo")
        .upload(path, store.logo_url, { upsert: true });
      uploadedFiles.push({ bucket: "store_logo", path });
      uploads.logo_url = supabaseAdmin.storage
        .from("store_logo")
        .getPublicUrl(path).data.publicUrl;
    }

    // 3️⃣ Upload banner if it's a file
    if (store.banner_url instanceof File) {
      const path = `store/${storeId}/banner-${uniqueId}.png`;
      await supabaseAdmin.storage
        .from("store-banner")
        .upload(path, store.banner_url, { upsert: true });
      uploadedFiles.push({ bucket: "store-banner", path });
      uploads.banner_url = supabaseAdmin.storage
        .from("store-banner")
        .getPublicUrl(path).data.publicUrl;
    }

    // 4️⃣ Update store with uploaded file URLs
    if (Object.keys(uploads).length > 0) {
      await supabase.from("stores").update(uploads).eq("id", storeId);
    }

    // 5️⃣ Insert store settings
    if (settings) {
      const { store_social_media, ...restSettings } = settings;

      const { error: settingsError } = await supabase
        .from("store_settings")
        .insert({ store_id: storeId, ...restSettings });
      if (settingsError) throw settingsError;

      if (store_social_media) {
        const { error: socialError } = await supabase
          .from("store_social_media")
          .insert({ store_id: storeId, ...store_social_media });
        if (socialError) throw socialError;
      }
    }

    return storeId;
  } catch (err: unknown) {
    // ❌ REMOVE ROLLBACK: Handled in createUser
    // ❌ Just remove storage cleanup too

    // Optionally log the error
    console.error("createStoreWithSettings failed:", err);

    throw err;
  }
}
