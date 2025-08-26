"use client";

import React from "react";
import { useParams } from "next/navigation";
import AddProducts, { Product } from "../../../../components/admin/dashboard/products/AddProducts";
import { dummyProducts } from "@/lib/store/dummyProducts";

const EditProductPage = () => {
  const params = useParams();
  const { id } = params;

  // Convert id from string to number
  const productId = Number(id);

  // Find the product from dummyProducts
  const productToEdit = dummyProducts.find((p) => p.id === productId);

  const handleUpdate = (updatedProduct: Product) => {
    console.log("Updated product:", updatedProduct);
    alert("Product updated! Check console for data.");
    // Optionally, update dummyProducts locally if needed
  };

  if (!productToEdit) {
    return <div className="p-6 text-white">Product not found!</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Product (ID: {id})</h1>
      <AddProducts product={productToEdit} onSubmit={handleUpdate} />
    </div>
  );
};

export default EditProductPage;
