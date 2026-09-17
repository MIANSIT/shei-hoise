"use client";

import { Spin } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useStore } from "@/lib/hook/stores/useStore";
import { useUpdateStore } from "@/lib/hook/stores/update/useUpdateStore";
import { StoreSocialMediaCard } from "@/app/components/admin/dashboard/store-settings/storeCard/StoreSocialMediaCard";
import type { UpdatedStoreSocialMedia } from "@/lib/types/store/store";

export default function SocialMediaPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const safeStoreId = storeId ?? "";
  const { socialMedia, setSocialMedia, loading: storeLoading } = useStore(safeStoreId);
  const { update } = useUpdateStore(safeStoreId);

  const handleUpdateSocialMedia = async (
    socialMediaData: UpdatedStoreSocialMedia,
  ): Promise<void> => {
    const updated = await update({ socialMediaData });
    if (updated.socialMedia) setSocialMedia(updated.socialMedia);
  };

  if (userLoading || storeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Social Media</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Links shown in your store footer and used by customers to find you on social platforms.
        </p>
      </div>

      <StoreSocialMediaCard
        socialMedia={socialMedia}
        onUpdate={handleUpdateSocialMedia}
      />
    </div>
  );
}
