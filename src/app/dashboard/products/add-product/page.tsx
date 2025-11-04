"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation"; // App Router
import AddProductForm, {
  AddProductFormRef,
} from "@/app/components/admin/dashboard/products/addProducts/AddProductForm";
import { ProductType } from "@/lib/schema/productSchema";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { createProduct } from "@/lib/queries/products/createProduct";

export default function AddProductPage() {
  const router = useRouter();
  const { success, error } = useSheiNotification();
  const { user, loading } = useCurrentUser();
  const formRef = useRef<AddProductFormRef>(null);

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

      formRef.current?.reset();
      router.push("/dashboard/products");
    } catch (err: unknown) {
      console.error(err);

      let errorMessage = "❌ Failed to add product. Please try again.";

      // Supabase error handling
      if (err && typeof err === "object" && "code" in err) {
        const supabaseErr = err as {
          code: string;
          message?: string;
          details?: string;
        };

        if (supabaseErr.code === "23505") {
          // Duplicate key error
          errorMessage =
            "❌ A product with this name or slug already exists. Please choose a different name or slug.";
        } else {
          errorMessage = `❌ ${supabaseErr.message ?? "Something went wrong."}`;
        }
      } else if (err instanceof Error) {
        errorMessage = `❌ ${err.message}`;
      } else if (typeof err === "string") {
        errorMessage = `❌ ${err}`;
      }

      error(errorMessage);
    }
  };

  return (
    <AddProductForm
      ref={formRef}
      storeId={user.store_id}
      onSubmit={(product) => handleSubmit(product)}
    />
  );
}
