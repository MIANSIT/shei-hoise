"use client";

import React from "react";
import AddProductForm from "../../../components/admin/dashboard/products/addProducts/AddProductForm";
import { ProductType } from "@/lib/schema/productSchema";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { createProduct } from "@/lib/queries/products/createProduct";

export default function AddProductPage() {
  const { success, error } = useSheiNotification();
  const { user, loading } = useCurrentUser();

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
    } catch (err) {
      console.error(err);
      error("❌ Failed to add product. Please try again.");
    }
  };

  return (
    <div className="p-6">
      <AddProductForm storeId={user.store_id} onSubmit={handleSubmit} />
    </div>
  );
}
