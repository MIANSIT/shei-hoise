// app/add-product/page.tsx
"use client";

import React from "react";
import ProductPageForm, { Product } from "../../../components/admin/dashboard/products/AddProducts";

export default function AddProductPage() {
  const handleSubmit = (product: Product) => {
    console.log("Adding product:", product);
    // Call your API to save new product
  };

  return <ProductPageForm onSubmit={handleSubmit} />;
}
