"use client";

import { useState } from "react";
import { updateStore } from "@/lib/queries/stores/update/updateStore";
import { uploadStoreMedia } from "@/lib/queries/stores/update/storeMedia";
import { updateStoreSettings } from "@/lib/queries/stores/update/updateStoreSettings";
import type {
  UpdatedStoreData,
  StoreData,
  UpdatedStoreSettings,
  StoreSettings,
} from "@/lib/types/store/store";

interface UpdateStoreInput {
  data: UpdatedStoreData;
  settingsPayload?: UpdatedStoreSettings;
  logoFile?: File | null;
  bannerFile?: File | null;
}

export function useUpdateStore(storeId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = async ({
    data,
    settingsPayload,
    logoFile,
    bannerFile,
  }: UpdateStoreInput): Promise<{
    store: StoreData | null;
    settings: StoreSettings | null;
  }> => {
    try {
      setLoading(true);
      setError(null);

      const payload: UpdatedStoreData = { ...data };

      // Upload logo if provided
      if (logoFile) {
        const logoUrl = await uploadStoreMedia(storeId, logoFile, "logo");
        if (logoUrl) payload.logo_url = logoUrl;
      }

      // Upload banner if provided
      if (bannerFile) {
        const bannerUrl = await uploadStoreMedia(storeId, bannerFile, "banner");
        if (bannerUrl) payload.banner_url = bannerUrl;
      }

      // Update store data
      const updatedStore = await updateStore(storeId, payload);

      // Update store settings if provided
      let updatedSettings: StoreSettings | null = null;
      if (settingsPayload) {
        updatedSettings = await updateStoreSettings(storeId, settingsPayload);
      }

      return { store: updatedStore, settings: updatedSettings };
    } catch (err) {
      setError(err as Error);
      return { store: null, settings: null };
    } finally {
      setLoading(false);
    }
  };

  return { update, loading, error };
}
