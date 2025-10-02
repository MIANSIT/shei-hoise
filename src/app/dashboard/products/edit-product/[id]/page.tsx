"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AddProductForm from "@/app/components/admin/dashboard/products/addProducts/AddProductForm";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { getProductById } from "@/lib/queries/products/getProductById";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import type { ProductType } from "@/lib/schema/productSchema";
import type { Product } from "@/lib/queries/products/getProducts";
import { mapProductToFormType } from "@/lib/hook/products/mapProductToFormType";

const EditProductPage = () => {
  const params = useParams();
  const { id } = params;
  const { success, error } = useSheiNotification();
  const { user, loading: userLoading } = useCurrentUser();

  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user?.store_id) return;

    setLoading(true);
    getProductById(user.store_id, id as string)
      .then((res: Product | null) => {
        if (!res) {
          error("Product not found.");
          return;
        }
        setProduct(mapProductToFormType(res, user.store_id!));
      })
      .catch(() => error("Failed to fetch product."))
      .finally(() => setLoading(false));
  }, [id, user?.store_id]);

  const handleUpdate = (updatedProduct: ProductType) => {
    try {
      console.log("Updated product:", updatedProduct);
      success(
        <div>
          <b>{updatedProduct.name}</b> has been updated successfully!
        </div>
      );
    } catch {
      error("❌ Failed to update product. Please try again.");
    }
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
