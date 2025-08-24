// components/checkout/DesktopCheckout.tsx
"use client";

import { useState, useEffect } from "react";
import useCartStore from "@/lib/store/cartStore";
import CartItemsList from "@/app/components/cart/CartItemList";
import { motion } from "framer-motion";
import CheckoutForm from "./UserCheckoutForm";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { CheckoutFormValues } from "@/lib/utils/formSchema";
import { useCheckoutStore } from "../../../../lib/store/userInformationStore";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const notify = useSheiNotification();
  const { clearFormData } = useCheckoutStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const subtotal = isMounted ? totalPrice() : 0;

  const handleCheckoutSubmit = async (values: CheckoutFormValues) => {
    setIsProcessing(true);
    try {
      console.log("Checkout values:", values);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      notify.success("Shipping information saved!");
          onCheckout();

    } catch (error) {
      notify.warning("Failed to save information. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalCheckout = () => {
    // Your existing checkout logic
    onCheckout();
    // Clear the form data after successful checkout
    clearFormData();
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cart Items Card */}
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-1">
            Your Cart ({displayCount} items)
          </h2>
          <div className="h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-lg shadow-yellow-500/30 mb-4"></div>
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
            </div>
          )}
        </div>
        {/* Customer Information Card */}
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-1">Customer Information</h2>
          <div className="h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-lg shadow-yellow-500/30 mb-4"></div>
          <CheckoutForm
            onSubmit={handleCheckoutSubmit}
            isLoading={isProcessing}
          />
          
        </div>
      </div>
    </div>
  );
};

export default DesktopCheckout;
