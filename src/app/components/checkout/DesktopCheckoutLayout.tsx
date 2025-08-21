// components/checkout/DesktopCheckout.tsx
"use client";

import { useState, useEffect } from "react";
import useCartStore from "@/lib/store/cartStore";
import CartItemsList from "@/app/components/cart/CartItemList";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface DesktopCheckoutProps {
  cartLength: number;
  displayCount: number;
  onCheckout: () => void;
}

const DesktopCheckout = ({
  cartLength,
  displayCount,
  onCheckout,
}: DesktopCheckoutProps) => {
  const { totalPrice } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const subtotal = isMounted ? totalPrice() : 0;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cart Items Card */}
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">
            Your Cart ({displayCount} items)
          </h2>
          {cartLength === 0 ? (
            <div className="text-center py-8">
              <p className="text-white">Your cart is empty</p>
            </div>
          ) : (
            <CartItemsList />
          )}
          {cartLength > 0 && (
            <div>
              <div className="flex justify-between mt-4 text-white border-gray-700 border-2 rounded-lg p-3">
                <span className="font-bold">Subtotal :</span>
                <motion.span
                  className="font-bold"
                  key={`subtotal-${subtotal}`}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  ${subtotal.toFixed(2)}
                </motion.span>
              </div>
              {/* <Button
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300"
                onClick={onCheckout}
              >
                Make Payment
              </Button> */}
            </div>
          )}
          
        </div>
        {/* Customer Information Card */}
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
          <p className="text-white">Form will be placed here later</p>
        </div>
      </div>
    </div>
  );
};

export default DesktopCheckout;
