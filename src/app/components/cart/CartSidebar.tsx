"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useCartItems } from "@/lib/hook/useCartItems";
import CartItemsList from "./CartItemList";
import { Button } from "@/components/ui/button";
import CartCheckoutLayout from "./CartCheckoutLayout";
import { useRouter, useParams } from "next/navigation";

type CartSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const params = useParams();
  const store_slug = params.store_slug as string;
  const router = useRouter();

  // Use the custom hook to get cart items with fresh data
  const { items: cartItems, calculations, loading } = useCartItems(store_slug);

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
    onClose(); // Close the sidebar first
    router.push(`/${store_slug}/checkout`);
  };

  const handleContinueShopping = () => {
    onClose();
    router.push(`/${store_slug}`);
  };

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md text-foreground bg-background shadow-xl z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className='flex flex-col h-full'>
          <div className='flex items-center justify-between p-4 border-b border-border'>
            <h2 className='text-lg font-semibold'>
              Your Cart ({calculations.totalItems})
            </h2>
            <button
              onClick={onClose}
              className='p-1 rounded-md hover:bg-accent cursor-pointer transition-colors'
              aria-label='Close cart'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
          
          <div className='flex-1 p-4 overflow-y-auto'>
            {loading ? (
              <div className='text-center py-8'>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading cart...</p>
              </div>
            ) : cartItems.length === 0 ? (
              <div className='text-center py-8'>
                <p className='text-muted-foreground'>Your cart is empty</p>
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

          {!loading && cartItems.length > 0 && (
            <CartCheckoutLayout
              subtotal={calculations.totalPrice}
              onCheckout={handleCheckout}
              buttonText="Proceed to Checkout"
            />
          )}
        </div>
      </div>
    </>
  );
}