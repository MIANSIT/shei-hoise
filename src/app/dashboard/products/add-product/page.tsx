"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation"; // App Router
import AddProductForm, {
  AddProductFormRef,
} from "@/app/components/admin/dashboard/products/addProducts/AddProductForm";
import { ProductType } from "@/lib/schema/productSchema";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { createProduct } from "@/lib/queries/products/createProduct";

export default function AddProductPage() {
  const router = useRouter();
  const { success, error } = useSheiNotification();
  const { user, loading } = useCurrentUser();
  const formRef = useRef<AddProductFormRef>(null);

  // Only block render on the very first load (no cached user yet).
  // If loading re-triggers due to Supabase token refresh on tab focus,
  // keep the form mounted so the draft isn't lost.
  if (loading && !user) return <p>Loading...</p>;
  if (!user || !user.store_id) return <p>No store found for this user.</p>;

  const handleSubmit = async (product: ProductType) => {
    const result = await createProduct(product);

    if (!result.success) {
      console.error("createProduct failed:", result.error);
      error(result.error);
      return;
    }

    success(
      <div>
        🎉 <b>{product.name}</b> has been added successfully!
      </div>
    );
    formRef.current?.reset();
    router.push("/dashboard/products");
  };

  return (
    <AddProductForm
      ref={formRef}
      storeId={user.store_id}
      onSubmit={(product) => handleSubmit(product)}
    />
  );
}
