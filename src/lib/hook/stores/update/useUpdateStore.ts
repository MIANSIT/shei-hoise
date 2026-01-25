"use client";

import { useState } from "react";
import { updateStore } from "@/lib/queries/stores/update/updateStore";
import { uploadStoreMedia } from "@/lib/queries/stores/update/storeMedia";
import { updateStoreSettings } from "@/lib/queries/stores/update/updateStoreSettings";
import { updateStoreSocialMedia } from "@/lib/queries/stores/update/updateStoreSocialMedia";
import type {
  UpdatedStoreData,
  StoreData,
  UpdatedStoreSettings,
  StoreSettings,
  StoreSocialMedia,
  UpdatedStoreSocialMedia,
} from "@/lib/types/store/store";

interface UpdateStoreInput {
  storeData?: UpdatedStoreData; // only store fields
  settingsData?: UpdatedStoreSettings; // only settings
  socialMediaData?: UpdatedStoreSocialMedia; // only social media
  logoFile?: File | null;
  bannerFile?: File | null;
}

export function useUpdateStore(storeId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = async ({
    storeData,
    settingsData,
    socialMediaData,
    logoFile,
    bannerFile,
  }: UpdateStoreInput): Promise<{
    store: StoreData | null;
    settings: StoreSettings | null;
    socialMedia: StoreSocialMedia | null;
  }> => {
    try {
      setLoading(true);
      setError(null);

      const storePayload: UpdatedStoreData = { ...(storeData ?? {}) };

      // Upload media if provided
      if (logoFile) {
        const logoUrl = await uploadStoreMedia(storeId, logoFile, "logo");
        if (logoUrl) storePayload.logo_url = logoUrl;
      }

      if (bannerFile) {
        const bannerUrl = await uploadStoreMedia(storeId, bannerFile, "banner");
        if (bannerUrl) storePayload.banner_url = bannerUrl;
      }

      // Update store
      const updatedStore = storePayload
        ? await updateStore(storeId, storePayload)
        : null;

      // Update settings
      const updatedSettings = settingsData
        ? await updateStoreSettings(storeId, settingsData)
        : null;

      // Update social media
      const updatedSocialMedia = socialMediaData
        ? await updateStoreSocialMedia(storeId, socialMediaData)
        : null;

      return {
        store: updatedStore,
        settings: updatedSettings,
        socialMedia: updatedSocialMedia,
      };
    } catch (err) {
      setError(err as Error);
      return { store: null, settings: null, socialMedia: null };
    } finally {
      setLoading(false);
    }
  };

  return { update, loading, error };
}
