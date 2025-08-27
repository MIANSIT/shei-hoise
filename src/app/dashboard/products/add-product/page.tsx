"use client";

import React from "react";
import ProductPageForm, {
  Product,
} from "../../../components/admin/dashboard/products/AddProducts";
import BackButton from "../../../components/ui/BackButton";
import ProtectedRoute from "@/app/components/common/ProtectedRoute";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification";

export default function AddProductPage() {
  const { success, error } = useSheiNotification(); // destructure methods

  const handleSubmit = (product: Product) => {
    try {
      // 👉 here you’d usually send data to API
      console.log("Adding product:", product);

      success(
        <div>
          <b>{product.title}</b> has been added successfully!
        </div>
      );
    } catch {
      error("❌ Failed to add product. Please try again.");
    }
  };

  return (
    <ProtectedRoute>
      <div>
        <BackButton label="All Products" href="/dashboard/products" />

        <ProductPageForm onSubmit={handleSubmit} />
      </div>
    </ProtectedRoute>
  );
}
