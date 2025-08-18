// components/cart/CartSidebar.tsx
"use client";

import { useEffect } from "react";
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
    console.log("Proceeding to checkout");
    // Add your checkout logic here
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md text-white bg-gray-900 shadow-xl z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className='flex flex-col h-full'>
          {/* Header */}
          <div className='flex items-center justify-between p-4 border-b'>
            <h2 className='text-lg font-semibold'>Your Cart ({totalItems()})</h2>
            <button
              onClick={onClose}
              className='p-1 rounded-md hover:bg-black cursor-pointer'
              aria-label='Close cart'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          {/* Cart Content */}
          <div className='flex-1 p-4 overflow-y-auto'>
            {cart.length === 0 ? (
              <div className='text-center py-8'>
                <p className='text-gray-500'>Your cart is empty</p>
                <Button
                  className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
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
            />
          )}
        </div>
      </div>
    </>
  );
}