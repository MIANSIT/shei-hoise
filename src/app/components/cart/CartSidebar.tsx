// components/cart/CartSidebar.tsx
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import useCartStore from "@/lib/store/cartStore";
import CartItemsList from "./CartItemList";
import { Button } from "@/components/ui/button";
import CartCheckoutLayout from "./CartCheckoutLayout";

type CartSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { cart, totalPrice, totalItems } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);

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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCheckout = () => {
    console.log("Proceeding to checkout");
  };
  const displayCount = isMounted ? totalItems() : 0;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md text-white bg-black shadow-xl z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className='flex flex-col h-full'>
          <div className='flex items-center justify-between p-4 border-b'>
            <h2 className='text-lg font-semibold'>Your Cart ({displayCount})</h2>
            <button
              onClick={onClose}
              className='p-1 rounded-md hover:bg-black cursor-pointer'
              aria-label='Close cart'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
          <div className='flex-1 p-4 overflow-y-auto'>
            {cart.length === 0 ? (
              <div className='text-center py-8'>
                <p className='text-gray-500'>Your cart is empty</p>
                <Button
                  className="mt-4 w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300"
                  onClick={onClose}
                >
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <CartItemsList />
            )}
          </div>

          {cart.length > 0 && (
            <CartCheckoutLayout
              subtotal={totalPrice()}
              onCheckout={handleCheckout}
              buttonText="Proceed to Checkout"
            />
          )}
        </div>
      </div>
    </>
  );
}