"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // App Router
import AddProductForm, {
  AddProductFormRef,
} from "@/app/components/admin/dashboard/products/addProducts/AddProductForm";
import { ProductType } from "@/lib/schema/productSchema";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { createProduct } from "@/lib/queries/products/createProduct";
import { getProductBySlug } from "@/lib/queries/products/getProductBySlug";
import { toDuplicateDraft } from "@/lib/utils/duplicateProduct";
import { useTranslation } from "@/lib/hook/useTranslation";

import { useBranches } from "@/lib/context/BranchContext";
import { WorkBranchPicker } from "@/app/components/admin/branches/WorkBranchPicker";
// useSearchParams needs a Suspense boundary on a statically rendered page.
export default function AddProductPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <AddProductPageContent />
    </Suspense>
  );
}

function AddProductPageContent() {
  const router = useRouter();
  const t = useTranslation();
  const { success, error } = useSheiNotification();
  const { user, loading } = useCurrentUser();
  const formRef = useRef<AddProductFormRef>(null);
  // Stores with branches: the starting stock goes to the branch picked above the form.
  const { enabled: branchesOn, workBranchId } = useBranches();
  const stockBranchId = branchesOn ? workBranchId : null;

  // ?duplicate=<slug>: start from a copy of that product (Products → Duplicate).
  const duplicateSlug = useSearchParams().get("duplicate");
  const [duplicate, setDuplicate] = useState<{ draft: ProductType; from: string } | null>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(!!duplicateSlug);
  const copySuffix = t.admin.productCopySuffix;

  useEffect(() => {
    if (!duplicateSlug || !user?.store_id) return;
    let cancelled = false;
    setDuplicateLoading(true);
    getProductBySlug(user.store_id, duplicateSlug)
      .then((source) => {
        if (cancelled) return;
        if (!source) {
          error(t.admin.productDuplicateLoadFailed);
          return;
        }
        setDuplicate({ draft: toDuplicateDraft(source, copySuffix), from: source.name });
      })
      .catch(() => {
        if (!cancelled) error(t.admin.productDuplicateLoadFailed);
      })
      .finally(() => {
        if (!cancelled) setDuplicateLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplicateSlug, user?.store_id]);

  // Only block render on the very first load (no cached user yet).
  // If loading re-triggers due to Supabase token refresh on tab focus,
  // keep the form mounted so the draft isn't lost.
  if (loading && !user) return <p>Loading...</p>;
  if (!user || !user.store_id) return <p>No store found for this user.</p>;
  if (duplicateLoading) return <p>Loading...</p>;

  const handleSubmit = async (product: ProductType) => {
    const result = await createProduct(product, stockBranchId);

    if (!result.success) {
      console.error("createProduct failed:", result.error);
      error(result.error);
      return;
    }

    success(
      <div>
        🎉 <b>{product.name}</b> has been added successfully!
      </div>
    );
    formRef.current?.reset();
    // The product list opens newest-first, so the new product is the first
    // row; justAdded highlights it for a moment.
    router.push(`/dashboard/products?justAdded=${result.productId}`);
  };

  return (
    <>
      {branchesOn && (
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-500/30 dark:bg-teal-500/10">
            <WorkBranchPicker label={t.branches.stockBranchLabel} />
            <p className="m-0 mt-1 text-xs text-muted-foreground">{t.branches.stockBranchAddHint}</p>
          </div>
        </div>
      )}
      <AddProductForm
        // Remount when switching between a blank form and a duplicate.
        key={duplicate ? `dup-${duplicateSlug}` : "new"}
        ref={formRef}
        initialProduct={duplicate?.draft}
        duplicatedFrom={duplicate?.from}
        storeId={user.store_id}
        onSubmit={(product) => handleSubmit(product)}
      />
    </>
  );
}
