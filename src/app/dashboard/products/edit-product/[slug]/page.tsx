"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AddProductForm from "@/app/components/admin/dashboard/products/addProducts/AddProductForm";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { getProductBySlug } from "@/lib/queries/products/getProductBySlug";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import type { ProductType } from "@/lib/schema/productSchema";

const EditProductPage = () => {
  const params = useParams();
  const { slug } = params;
  const { success, error } = useSheiNotification();
  const { user, loading: userLoading } = useCurrentUser();

  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!slug || !user?.store_id) return;

  setLoading(true);
  getProductBySlug(user.store_id, slug as string)
    .then((res) => {
      if (!res) {
        error("Product not found.");
        return;
      }
      setProduct(res); // already ProductType
    })
    .catch((err) => {
      console.error(err);
      error("Failed to fetch product.");
    })
    .finally(() => setLoading(false));
}, [slug, user?.store_id]);


  const handleUpdate = (updatedProduct: ProductType) => {
    success(
      <div>
        <b>{updatedProduct.name}</b> has been updated successfully!
      </div>
    );
  };

  if (userLoading || loading) return <div className="p-6">Loading...</div>;
  if (!product) return <div className="p-6">Product not found!</div>;

  return (
    <div className="p-6">
      <AddProductForm
        product={product}
        storeId={product.store_id}
        onSubmit={handleUpdate}
      />
    </div>
  );
};

export default EditProductPage;
