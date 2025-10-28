"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import useCartStore from "@/lib/store/cartStore";
import CartItemsList from "./CartItemList";
import CartCheckoutLayout from "./CartCheckoutLayout";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";

type CartBottomBarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CartBottomBar({ isOpen, onClose }: CartBottomBarProps) {
  const { getCartByStore, totalPriceByStore, totalItemsByStore } = useCartStore();
  const params = useParams();
  const store_slug = params.store_slug as string;
  
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  // Only access store after mounting
  const storeCart = isMounted ? getCartByStore(store_slug) : [];
  const storeTotalPrice = isMounted ? totalPriceByStore(store_slug) : 0;
  const storeTotalItems = isMounted ? totalItemsByStore(store_slug) : 0;

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCheckout = () => {
    router.push(`/${store_slug}/checkout`);
  };

  const handleContinueShopping = () => {
    onClose();
    router.push(`/${store_slug}`);
  };

  const displayCount = isMounted ? storeTotalItems : 0;

  // Don't render anything if not mounted
  if (!isMounted) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 bg-background text-foreground shadow-lg z-50 transition-transform duration-300 ease-in-out lg:hidden rounded-tl-2xl rounded-tr-2xl border-t border-border ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Your Cart ({displayCount})
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-accent cursor-pointer transition-colors"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto pb-4">
            {storeCart.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Your cart is empty</p>
                <Button
                  className="mt-4 w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-primary-foreground hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300"
                  onClick={handleContinueShopping}
                >
                  Continue Shopping at {store_slug}
                </Button>
              </div>
            ) : (
              <CartItemsList />
            )}
          </div>
          {storeCart.length > 0 && (
            <CartCheckoutLayout
              subtotal={storeTotalPrice}
              onCheckout={handleCheckout}
              buttonText="Proceed to Checkout"
            />
          )}
        </div>
      </div>
    </>
  );
}