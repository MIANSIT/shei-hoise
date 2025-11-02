"use client";

import { useState, useEffect } from "react";
import useCartStore from "@/lib/store/cartStore";
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
import DesktopCheckout from "../../components/products/checkout/DesktopCheckoutLayout";
import MobileCheckout from "../../components/products/checkout/MobileCheckoutLayout";
import { useParams, useRouter } from "next/navigation";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";

const SimpleLoader = ({ loadingText }: { loadingText?: string }) => {
  return (
    <div className="inline-flex items-center gap-2">
      <div
        className="h-6 w-6 border-3 border-primary border-r-transparent rounded-full animate-spin"
        style={{ animationDuration: "0.75s" }}
      />
      {loadingText && (
        <span className="text-primary text-sm font-medium">{loadingText}</span>
      )}
    </div>
  );
};

export default function CheckoutPage() {
  const { getCartByStore } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);
  const [storeExists, setStoreExists] = useState<boolean | null>(null);
  const params = useParams();
  const router = useRouter();
  const store_slug = params.store_slug as string;

  useEffect(() => {
    setIsMounted(true);

    const checkStoreExists = async () => {
      const storeId = await getStoreIdBySlug(store_slug);
      setStoreExists(!!storeId);
    };

    checkStoreExists();
  }, [store_slug]);

  const storeCartItems = getCartByStore(store_slug);

  useEffect(() => {
    if (isMounted && storeCartItems.length === 0) {
      const redirectTimer = setTimeout(() => {
        router.push(`/orders`);
      }, 2000);

      return () => clearTimeout(redirectTimer);
    }
  }, [isMounted, storeCartItems.length, store_slug, router]);

  const handleMakePayment = () => {};

  const displayCount = isMounted ? storeCartItems.length : 0;

  if (storeExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SimpleLoader loadingText="Loading store information..." />
      </div>
    );
  }

  // Store not found
  if (storeExists === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Store Not Found</h1>
          <p>The store you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  if (storeCartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-green-600">
            Your Order is completed
          </h1>
          <p className="text-muted-foreground">
            Redirecting to Order Status...
          </p>
        </div>
        <SimpleLoader />
      </div>
    );
  }

  return (
    <>
      <Header />

      <div className="hidden md:block">
        <DesktopCheckout
          cartLength={storeCartItems.length}
          displayCount={displayCount}
          onCheckout={handleMakePayment}
        />
      </div>

      <div className="block md:hidden">
        <MobileCheckout
          cartLength={storeCartItems.length}
          displayCount={displayCount}
          onCheckout={handleMakePayment}
        />
      </div>

      <Footer />
    </>
  );
}
