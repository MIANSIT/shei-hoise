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

  if (loading) return <p>Loading...</p>;
  if (!user || !user.store_id) return <p>No store found for this user.</p>;

  const handleSubmit = async (product: ProductType) => {
    try {
      await createProduct(product);
      success(
        <div>
          🎉 <b>{product.name}</b> has been added successfully!
        </div>
      );

      // Reset the form using ref
      formRef.current?.reset();

      // Redirect to all products page
      router.push("/dashboard/products");
    } catch (err) {
      console.error(err);
      error("❌ Failed to add product. Please try again.");
    }
  };

  return (
    <AddProductForm
      ref={formRef}
      storeId={user.store_id}
      onSubmit={(product) => handleSubmit(product)}
    />
  );
}
