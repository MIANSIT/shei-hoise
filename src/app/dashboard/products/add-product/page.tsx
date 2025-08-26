// app/add-product/page.tsx
"use client";

import React from "react";
import ProductPageForm, { Product } from "../../../components/admin/dashboard/products/AddProducts";
import BackButton from "../../../components/ui/BackButton";

export default function AddProductPage() {
  const handleSubmit = (product: Product) => {
    console.log("Adding product:", product);
  };

  return (
    <div>
      {/* Back Button */}
      <BackButton label="All Products" href="/dashboard/products" />

      {/* Product Form */}
      <ProductPageForm onSubmit={handleSubmit} />
    </div>
  );
}
