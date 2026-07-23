"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AddBundleForm from "@/app/components/admin/dashboard/products/addBundle/AddBundleForm";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { getBundleBySlug } from "@/lib/queries/bundles/getBundleBySlug";
import { updateBundle } from "@/lib/queries/bundles/updateBundle";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import type { BundleType } from "@/lib/schema/bundleSchema";

const EditBundlePage = () => {
  const params = useParams();
  const router = useRouter();
  const { slug } = params;
  const { success, error } = useSheiNotification();
  const { user, loading: userLoading } = useCurrentUser();

  const [bundle, setBundle] = useState<(BundleType & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug || !user?.store_id) return;

    const fetchBundle = async () => {
      setLoading(true);
      try {
        const res = await getBundleBySlug(user.store_id!, slug as string);
        if (!res) {
          error("Bundle not found.");
          return;
        }
        setBundle(res);
      } catch (err) {
        console.error(err);
        error("Failed to fetch bundle.");
      } finally {
        setLoading(false);
      }
    };

    fetchBundle();
  }, [slug, user?.store_id, error]);

  const handleUpdate = async (updated: BundleType) => {
    if (!user?.store_id || !bundle?.id) return;
    try {
      await updateBundle({ ...updated, id: bundle.id, store_id: user.store_id });
      success(
        <div>
          <b>{updated.name}</b> has been updated successfully!
        </div>
      );
      setTimeout(() => router.push("/dashboard/products/bundles"), 1000);
    } catch (err: unknown) {
      console.error("Update failed:", err);
      error(err instanceof Error ? err.message : "Failed to update bundle.");
    }
  };

  if (userLoading || loading) return <div className="p-6">Loading...</div>;
  if (!bundle) return <div className="p-6">Bundle not found!</div>;

  return (
    <div>
      <AddBundleForm bundle={bundle} storeId={bundle.store_id} onSubmit={handleUpdate} />
    </div>
  );
};

export default EditBundlePage;
