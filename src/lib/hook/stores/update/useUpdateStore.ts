"use client";

import { useState } from "react";
import { updateStore } from "@/lib/queries/stores/update/updateStore";
import {
  uploadStoreMedia,
  deleteStoreMedia,
} from "@/lib/queries/stores/update/storeMedia";
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
  storeData?: UpdatedStoreData;
  settingsData?: UpdatedStoreSettings;
  socialMediaData?: UpdatedStoreSocialMedia;
  logoFile?: File | null;
  bannerFile?: File | null;
  clearLogo?: boolean;
  clearBanner?: boolean;
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
    clearLogo,
    clearBanner,
  }: UpdateStoreInput): Promise<{
    store: StoreData | null;
    settings: StoreSettings | null;
    socialMedia: StoreSocialMedia | null;
  }> => {
    try {
      setLoading(true);
      setError(null);

      // Start with provided storeData, stripping undefined values so
      // Supabase doesn't treat them as explicit nulls
      const storePayload: UpdatedStoreData = {};
      if (storeData) {
        for (const [key, value] of Object.entries(storeData)) {
          if (value !== undefined) {
            (storePayload as Record<string, unknown>)[key] = value;
          }
        }
      }

      // Handle logo: upload new, or clear existing
      if (logoFile) {
        const logoUrl = await uploadStoreMedia(storeId, logoFile, "logo");
        if (logoUrl) storePayload.logo_url = logoUrl;
      } else if (clearLogo) {
        await deleteStoreMedia(storeId, "logo");
        storePayload.logo_url = null;
      }

      // Handle banner: upload new, or clear existing
      if (bannerFile) {
        const bannerUrl = await uploadStoreMedia(storeId, bannerFile, "banner");
        if (bannerUrl) storePayload.banner_url = bannerUrl;
      } else if (clearBanner) {
        await deleteStoreMedia(storeId, "banner");
        storePayload.banner_url = null;
      }

      // Only call updateStore if there are actual fields to update
      const updatedStore =
        Object.keys(storePayload).length > 0
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
