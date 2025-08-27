"use client";

import React from "react";
import { useParams } from "next/navigation";
import AddProducts, {
  Product,
} from "../../../../components/admin/dashboard/products/AddProducts";
import { dummyProducts } from "@/lib/store/dummyProducts";
import BackButton from "../../../../components/ui/BackButton";
import ProtectedRoute from "@/app/components/common/ProtectedRoute";
import { useSheiNotification } from "../../../../../lib/hook/useSheiNotification";

const EditProductPage = () => {
  const params = useParams();
  const { id } = params;

  const productId = Number(id);

  const productToEdit = dummyProducts.find((p) => p.id === productId);

  const { success, error } = useSheiNotification();

  const handleUpdate = (updatedProduct: Product) => {
    try {
      console.log("Updated product:", updatedProduct);

      // ✅ show success notification with JSX
      success(
        <div>
          <b>{updatedProduct.title}</b> has been updated successfully!
        </div>
      );
    } catch {
      error("❌ Failed to update product. Please try again.");
    }
  };

  if (!productToEdit) {
    return (
      <div className="p-6 text-white">
        Product not found!
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6">
        <BackButton
          label="All Products"
          href="/dashboard/products"
          variant="outline"
          size="default"
        />

        <h1 className="text-2xl font-bold mb-6">Edit Product (ID: {id})</h1>

        <AddProducts product={productToEdit} onSubmit={handleUpdate} />
      </div>
    </ProtectedRoute>
  );
};

export default EditProductPage;
