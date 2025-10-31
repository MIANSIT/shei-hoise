// app/checkout/page.tsx
"use client";

import { useState, useEffect } from "react";
import useCartStore from "@/lib/store/cartStore";
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
import DesktopCheckout from "../../components/products/checkout/DesktopCheckoutLayout";
import MobileCheckout from "../../components/products/checkout/MobileCheckoutLayout";

export default function CheckoutPage() {
  const { cart, totalItems } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMakePayment = () => {
    console.log("Proceeding Payment");
  };

  const displayCount = isMounted ? totalItems() : 0;

  return (
    <>
      <Header />
      
      {/* Desktop Version */}
      <div className="hidden md:block">
        <DesktopCheckout
          cartLength={cart.length}
          displayCount={displayCount}
          onCheckout={handleMakePayment}
        />
      </div>

      {/* Mobile Version */}
      <div className="block md:hidden">
        <MobileCheckout
          cartLength={cart.length}
          displayCount={displayCount}
          onCheckout={handleMakePayment}
        />
      </div>

      <Footer />
    </>
  );
}