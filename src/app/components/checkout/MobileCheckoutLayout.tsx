// components/checkout/MobileCheckout.tsx
"use client";

import { useState, useEffect } from "react";
import useCartStore from "@/lib/store/cartStore";
import CartItemsList from "@/app/components/cart/CartItemList";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MobileCheckoutProps {
  cartLength: number;
  displayCount: number;
  onCheckout: () => void;
}

const MobileCheckout = ({
  cartLength,
  displayCount,
  onCheckout,
}: MobileCheckoutProps) => {
  const { totalPrice } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const subtotal = isMounted ? totalPrice() : 0;

  const steps = [
    {
      title: "Customer Information",
      content: (
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-md p-4 mt-4">
          <h2 className="text-lg font-semibold mb-3">Customer Information</h2>
          <p className="text-gray-300 text-sm">
            Form will be placed here later
          </p>
        </div>
      ),
    },
    {
      title: "Cart Items",
      content: (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-3">
            Your Cart ({displayCount} items)
          </h2>

          {cartLength === 0 ? (
            <div className="text-center py-6 bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-md">
              <p className="text-white">Your cart is empty</p>
            </div>
          ) : (
            <CartItemsList />
          )}
        </div>
      ),
    },
    {
      title: "Order Summary",
      content: (
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-md p-4 mt-4">
          <h2 className="text-lg font-semibold mb-3">Order Summary</h2>
          <div>
            <div className="flex justify-between mb-4 text-white items-center">
              <span className="text-sm">SubTotal:</span>
              <motion.span
                className="font-bold text-lg"
                key={`subtotal-${subtotal}`}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                ${subtotal.toFixed(2)}
              </motion.span>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300 py-3 text-base font-medium"
              onClick={onCheckout}
            >
              Make Payment
            </Button>
          </div>
        </div>
      ),
    },
  ];

  const nextStep = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Checkout</h1>
      <div className="flex items-center justify-center gap-2">
        <Button
            onClick={prevStep}
            disabled={activeStep === 0}
            variant="outline"
            className="flex items-center gap-1"
          >
            <ChevronLeft size={8} />
          </Button>

          {activeStep < steps.length - 1 ? (
            <Button onClick={nextStep} className="flex items-center gap-1">
              <ChevronRight size={8} />
            </Button>
          ) : (
            <Button
              onClick={onCheckout}
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700"
            >
              Complete Purchase
            </Button>
          )}
      </div>
      </div>
      {/* <div className="flex mb-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex-1 flex flex-col items-center mx-1"
            onClick={() => setActiveStep(index)}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                index === activeStep
                  ? "bg-yellow-500 text-black"
                  : index < activeStep
                  ? "bg-green-500 text-white"
                  : "bg-gray-700 text-white"
              } font-medium text-sm`}
            >
              {index + 1}
            </div>
            <span
              className={`text-xs  text-center ${
                index === activeStep
                  ? "text-yellow-500 font-medium"
                  : "text-gray-400"
              } ${index < activeStep ? "text-green-500" : ""}`}
            >
              {step.title.split(" ")[0]}
            </span>
          </div>
        ))}
      </div> */}
      <div className="w-full bg-gray-700 rounded-full h-1.5 mb-6">
        <div
          className="bg-yellow-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
        ></div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="min-h-[40vh]"
        >
          {steps[activeStep].content}
        </motion.div>
      </AnimatePresence>

      
    </div>
  );
};

export default MobileCheckout;
