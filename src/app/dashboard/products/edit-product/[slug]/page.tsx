"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation"; // ⬅️ added useRouter
import AddProductForm from "@/app/components/admin/dashboard/products/addProducts/AddProductForm";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { getProductBySlug } from "@/lib/queries/products/getProductBySlug";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import type { ProductType } from "@/lib/schema/productSchema";
import { updateProduct } from "@/lib/queries/products/updateProduct";
import {
  productUpdateSchema,
  ProductUpdateType,
} from "@/lib/schema/productUpdateSchema";

const EditProductPage = () => {
  const params = useParams();
  const router = useRouter(); // ⬅️ initialize router
  const { slug } = params;
  const { success, error } = useSheiNotification();
  const { user, loading: userLoading } = useCurrentUser();

  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug || !user?.store_id) return;

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await getProductBySlug(user.store_id!, slug as string);
        if (!res) {
          error("Product not found.");
          return;
        }
        setProduct(res);
      } catch (err) {
        console.error(err);
        error("Failed to fetch product.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug, user?.store_id, error]);

  const handleUpdate = async (updatedProduct: ProductType) => {
    if (!user?.store_id) return;

    try {
      // Validate & transform to ProductUpdateType
      const payload: ProductUpdateType = productUpdateSchema.parse({
        ...updatedProduct,
        store_id: user.store_id,
        id: updatedProduct.id,
      });

      await updateProduct(payload);

      success(
        <div>
          <b>{updatedProduct.name}</b> has been updated successfully!
        </div>
      );

      // ✅ Redirect after success
      setTimeout(() => {
        router.push("/dashboard/products");
      }, 1000); // optional delay to let the toast show
    } catch (err: unknown) {
      console.error("Update failed:", err);
      if (err instanceof Error) {
        error(err.message);
      } else {
        error("Failed to update product.");
      }
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
