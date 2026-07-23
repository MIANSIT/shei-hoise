"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import AddBundleForm, {
  AddBundleFormRef,
} from "@/app/components/admin/dashboard/products/addBundle/AddBundleForm";
import { BundleType } from "@/lib/schema/bundleSchema";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { createBundle } from "@/lib/queries/bundles/createBundle";

export default function AddBundlePage() {
  const router = useRouter();
  const { success, error } = useSheiNotification();
  const { user, loading } = useCurrentUser();
  const formRef = useRef<AddBundleFormRef>(null);

  if (loading && !user) return <p>Loading...</p>;
  if (!user || !user.store_id) return <p>No store found for this user.</p>;

  const handleSubmit = async (bundle: BundleType) => {
    try {
      await createBundle(bundle);
      success(
        <div>
          🎉 <b>{bundle.name}</b> has been added successfully!
        </div>
      );
      formRef.current?.reset();
      router.push("/dashboard/products/bundles");
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "❌ Failed to add bundle. Please try again.";
      error(message);
    }
  };

  return (
    <AddBundleForm
      ref={formRef}
      storeId={user.store_id}
      onSubmit={(bundle) => handleSubmit(bundle)}
    />
  );
}
