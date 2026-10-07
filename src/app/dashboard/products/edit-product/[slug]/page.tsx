"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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

import { useBranches } from "@/lib/context/BranchContext";
import { WorkBranchPicker } from "@/app/components/admin/branches/WorkBranchPicker";
import { getProductBranchStock } from "@/lib/queries/inventory/getProductBranchStock";
import { useTranslation } from "@/lib/hook/useTranslation";
const EditProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = params;
  const { success, error } = useSheiNotification();
  const { user, loading: userLoading } = useCurrentUser();

  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslation();

  // Stores with branches: the stock fields show — and save — the branch picked
  // above the form, not the store-wide total (the sum of every branch).
  const { enabled: branchesOn, workBranchId } = useBranches();
  const stockBranchId = branchesOn ? workBranchId : null;
  const [branchStock, setBranchStock] = useState<{
    branchId: string;
    product: number;
    variants: Record<string, number>;
  } | null>(null);

  // Get the returnUrl from query params (passed from products list page)
  const returnUrl = searchParams.get("returnUrl");

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

  useEffect(() => {
    if (!stockBranchId || !product?.id) return;
    let cancelled = false;
    getProductBranchStock(product.id, stockBranchId).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setBranchStock({ branchId: stockBranchId, product: result.product, variants: result.variants });
      } else {
        error(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stockBranchId, product?.id, error]);

  // The product with the picked branch's stock in place of the store total.
  const stockReady = !stockBranchId || branchStock?.branchId === stockBranchId;
  const formProduct = useMemo(() => {
    if (!product || !stockBranchId || branchStock?.branchId !== stockBranchId) return product;
    return {
      ...product,
      stock: branchStock.product,
      variants: product.variants?.map((variant) => ({
        ...variant,
        stock: variant.id ? (branchStock.variants[variant.id] ?? 0) : variant.stock,
      })),
    };
  }, [product, stockBranchId, branchStock]);

  const handleUpdate = async (updatedProduct: ProductType) => {
    if (!user?.store_id) return;

    try {
      // ✅ Ensure at least one primary image
      if (updatedProduct.images && updatedProduct.images.length > 0) {
        const primaryExists = updatedProduct.images.some(
          (img) => img.isPrimary,
        );
        if (!primaryExists) {
          updatedProduct.images[0].isPrimary = true; // fallback
        }
      }

      // Validate & transform to ProductUpdateType
      const payload: ProductUpdateType = productUpdateSchema.parse({
        ...updatedProduct,
        store_id: user.store_id,
        id: updatedProduct.id,
      });

      const result = await updateProduct(payload, stockBranchId);

      if (!result.success) {
        console.error("Update failed:", result.error);
        error(result.error);
        return;
      }

      success(
        <div>
          <b>{updatedProduct.name}</b> has been updated successfully!
        </div>,
      );

      setTimeout(() => {
        // Navigate back to the page they came from, or default to products list
        if (returnUrl) {
          router.push(returnUrl);
        } else {
          router.push("/dashboard/products");
        }
      }, 1000);
    } catch (err: unknown) {
      // Only reachable for errors before/outside the updateProduct call
      // itself (e.g. the productUpdateSchema.parse() above) — updateProduct
      // no longer throws, it returns { success: false, error }.
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
    <div className="">
      {branchesOn && (
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-500/30 dark:bg-teal-500/10">
            <WorkBranchPicker label={t.branches.stockBranchLabel} />
            <p className="m-0 mt-1 text-xs text-muted-foreground">{t.branches.stockBranchEditHint}</p>
          </div>
        </div>
      )}
      {stockReady && formProduct ? (
        <AddProductForm
          // Remount for another branch so the stock fields load that branch's numbers.
          key={stockBranchId ?? "store"}
          product={formProduct}
          storeId={product.store_id}
          onSubmit={handleUpdate}
        />
      ) : (
        <div className="p-6">Loading...</div>
      )}
    </div>
  );
};

export default EditProductPage;