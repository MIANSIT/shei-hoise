"use client";
import React from "react";
import AddProductForm from "../../../components/admin/dashboard/products/MainProduct/AddProductForm";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification";
import { ProductFormValues } from "../../../../lib/utils/formSchema";

export default function AddProductPage() {
  const { success, error } = useSheiNotification();

  const handleSubmit = (product: ProductFormValues) => {
    try {
      // API call here (mock for now)
      console.log("Adding product:", product);

      success(
        <div>
          🎉 <b>{product.title}</b> has been added successfully!
        </div>
      );
    } catch {
      error("❌ Failed to add product. Please try again.");
    }
  };

  return (
    
      
        

        <AddProductForm onSubmit={handleSubmit} />
     
  );
}
