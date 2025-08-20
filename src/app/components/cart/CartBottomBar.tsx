"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import useCartStore from "@/lib/store/cartStore";
import CartItemsList from "./CartItemList";
import CartCheckoutLayout from "./CartCheckoutLayout";
import { Button } from "@/components/ui/button";

type CartBottomBarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CartBottomBar({ isOpen, onClose }: CartBottomBarProps) {
  const { cart, totalPrice, totalItems } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);

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
    console.log("Proceeding to checkout");
    // Add your checkout logic here
  };

  // Only show cart count after component has mounted
  const displayCount = isMounted ? totalItems() : 0;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Bottom Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-lg z-50 transition-transform duration-300 ease-in-out lg:hidden rounded-tl-2xl rounded-tr-2xl ${
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
              className="p-1 rounded-md hover:bg-black cursor-pointer"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="max-h-[60vh] overflow-y-auto pb-4">
            {cart.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Your cart is empty</p>
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