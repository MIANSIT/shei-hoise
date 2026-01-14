// lib/actions/stores/createStoreWithSettings.ts
"use server";

import { supabase, supabaseAdmin } from "@/lib/supabase";
import { StoreType, StoreSettingsType } from "@/lib/schema/onboarding/user.schema";

type CreateStoreArgs = {
  ownerId: string;
  store: StoreType;
  settings?: StoreSettingsType;
};

export async function createStoreWithSettings({
  ownerId,
  store,
  settings,
}: CreateStoreArgs) {
  let storeId: string | null = null;
  const uploadedFiles: { bucket: string; path: string }[] = [];

  try {
    // 1️⃣ Create store (handle File | string correctly)
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
    // 2️⃣ Logo upload
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

    // 3️⃣ Banner upload
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

    if (Object.keys(uploads).length > 0) {
      await supabase.from("stores").update(uploads).eq("id", storeId);
    }

    // 4️⃣ Store settings
    if (settings) {
      await supabase.from("store_settings").insert({
        store_id: storeId,
        ...settings,
      });
    }

    return storeId;
  } catch (err) {
    // 🔄 Rollback DB
    if (storeId) {
      await supabase.from("stores").delete().eq("id", storeId);
    }

    // 🔄 Rollback storage
    for (const file of uploadedFiles) {
      await supabaseAdmin.storage.from(file.bucket).remove([file.path]);
    }

    throw err;
  }
}
