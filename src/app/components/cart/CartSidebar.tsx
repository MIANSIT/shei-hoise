"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import useCartStore from "@/lib/store/cartStore";
import CartItemsList from "./CartItemList";
import { Button } from "@/components/ui/button";
import CartCheckoutLayout from "./CartCheckoutLayout";
import { useRouter, useParams } from "next/navigation";

type CartSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { getCartByStore, totalPriceByStore, totalItemsByStore } = useCartStore();
  const params = useParams();
  const store_slug = params.store_slug as string;
  
  const [isMounted, setIsMounted] = useState(false);
  const [currentStoreSlug, setCurrentStoreSlug] = useState(store_slug);
  const router = useRouter();

  // Set mounted on component mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update current store slug when params change
  useEffect(() => {
    setCurrentStoreSlug(store_slug);
  }, [store_slug]);

  // Get store-specific cart data
  const storeCart = isMounted ? getCartByStore(currentStoreSlug) : [];
  const storeTotalPrice = isMounted ? totalPriceByStore(currentStoreSlug) : 0;
  const storeTotalItems = isMounted ? totalItemsByStore(currentStoreSlug) : 0;

  // Prevent background scrolling when sidebar is open
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

  const handleCheckout = () => {
    router.push(`/${currentStoreSlug}/checkout`);
  };

  const handleContinueShopping = () => {
    onClose();
    router.push(`/${currentStoreSlug}`);
  };

  const displayCount = isMounted ? storeTotalItems : 0;

  // Don't render anything if not mounted or not open
  if (!isMounted || !isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md text-foreground bg-background shadow-xl z-50 transition-transform duration-300 ease-in-out"
      >
        <div className='flex flex-col h-full'>
          <div className='flex items-center justify-between p-4 border-b border-border'>
            <h2 className='text-lg font-semibold'>Your Cart ({displayCount})</h2>
            <button
              onClick={onClose}
              className='p-1 rounded-md hover:bg-accent cursor-pointer transition-colors'
              aria-label='Close cart'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
          <div className='flex-1 p-4 overflow-y-auto'>
            {storeCart.length === 0 ? (
              <div className='text-center py-8'>
                <p className='text-muted-foreground'>Your cart is empty</p>
                <Button
                  className="mt-4 w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-primary-foreground hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300"
                  onClick={handleContinueShopping}
                >
                  Continue Shopping at {currentStoreSlug}
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