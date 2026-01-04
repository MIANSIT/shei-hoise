"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getProductsWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { OrderProduct } from "@/lib/types/order";
import OrderDetails from "../admin/order/create-order/OrderDetails";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { useParams } from "next/navigation";
import { CustomOrderSkeleton } from "../../components/skeletons/CustomOrderSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SheiAlert,
  SheiAlertDescription,
} from "../../components/ui/sheiAlert/SheiAlert";
import { Link, Copy, Check } from "lucide-react";
import {
  compressToEncodedURIComponent,
  // decompressFromEncodedURIComponent,
} from "lz-string";

export default function CustomOrder() {
  const params = useParams();
  const storeSlug = Array.isArray(params.store_slug)
    ? params.store_slug[0]
    : params.store_slug;

  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    description: string;
    variant?: "destructive";
  }>({
    show: false,
    title: "",
    description: "",
  });

  // Show toast
  const showToast = (
    title: string,
    description: string,
    variant?: "destructive"
  ) => {
    setToast({ show: true, title, description, variant });
    setTimeout(
      () => setToast({ show: false, title: "", description: "" }),
      3000
    );
  };

  // Reset link when order changes
  useEffect(() => {
    setGeneratedLink(null);
  }, [orderProducts]);

  // Fetch products using storeSlug
  const fetchProducts = useCallback(async () => {
    if (!storeSlug) {
      showToast("Store not found", "Store slug missing in URL.", "destructive");
      return;
    }

    setLoading(true);
    try {
      const storeId = await getStoreIdBySlug(storeSlug);
      if (!storeId) {
        showToast(
          "Invalid Store",
          "Could not find a store with this slug.",
          "destructive"
        );
        return;
      }

      const res = await getProductsWithVariants({ storeId });
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
      showToast(
        "Error Loading Products",
        "Failed to load products. Please try again.",
        "destructive"
      );
    } finally {
      setLoading(false);
    }
  }, [storeSlug]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const isFormValid = orderProducts.length > 0;

  // Copy link to clipboard
  const copyLinkToClipboard = (link: string) => {
    navigator.clipboard.writeText(window.location.origin + link);
    setCopied(true);
    showToast(
      "Link Copied",
      "The order link has been copied to your clipboard."
    );
    setTimeout(() => setCopied(false), 2000);
  };

  // Ultra-compact encoding with compression
  const handleGenerateLink = async () => {
    if (!isFormValid || !storeSlug) return;

    try {
      const res = await fetch("/api/generate-order-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: await getStoreIdBySlug(storeSlug),
          store_slug: storeSlug,
          products: orderProducts.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setGeneratedLink(data.url);
      copyLinkToClipboard(data.url);

      showToast("Order Link Generated", "Link copied successfully!");
    } catch (err) {
      showToast("Error", "Failed to generate order link", "destructive");
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    copyLinkToClipboard(generatedLink);
  };

  if (loading) {
    return <CustomOrderSkeleton />;
  }

  return (
    <div className='h-full overflow-auto p-4 md:p-6 rounded-xl bg-background'>
      {/* Toast Notification */}
      {toast.show && (
        <div className='fixed top-4 right-4 z-50 max-w-sm'>
          <SheiAlert variant={toast.variant}>
            <SheiAlertDescription>
              <div className='flex flex-col'>
                <span className='font-medium'>{toast.title}</span>
                <span>{toast.description}</span>
              </div>
            </SheiAlertDescription>
          </SheiAlert>
        </div>
      )}

      <div className='max-w-7xl mx-auto space-y-6'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-2'>
          <div>
            <h3 className='text-lg font-semibold text-foreground'>
              Quick Order Link
            </h3>
            <p className='text-sm text-muted-foreground'>
              Generate a unique order link for your customers instantly.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className='w-full'>
          {products.length > 0 ? (
            <OrderDetails
              products={products}
              orderProducts={orderProducts}
              setOrderProducts={setOrderProducts}
            />
          ) : (
            <CustomOrderSkeleton />
          )}
        </div>

        {/* Divider / Spacing */}
        <div className='border-t border-border mt-6 mb-4' />

        {/* Generate Link Section */}
        <div className='flex flex-col sm:flex-row w-full justify-end sm:items-center gap-3'>
          {!generatedLink ? (
            <Button
              disabled={!isFormValid}
              onClick={handleGenerateLink}
              className='w-full sm:w-auto'
            >
              <Link className='w-4 h-4 mr-2' />
              Generate & Copy Order Link
            </Button>
          ) : (
            <>
              <Input
                type='text'
                readOnly
                value={window.location.origin + generatedLink}
                className='border border-border rounded-lg px-3 py-2 text-sm w-full sm:w-96 focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground'
              />
              <Button onClick={handleCopyLink} className='w-full sm:w-auto'>
                {copied ? (
                  <Check className='w-4 h-4 mr-2' />
                ) : (
                  <Copy className='w-4 h-4 mr-2' />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
