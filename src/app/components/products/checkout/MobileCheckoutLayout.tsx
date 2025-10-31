// components/checkout/MobileCheckout.tsx
"use client";

import { useState, useEffect } from "react";
import useCartStore from "@/lib/store/cartStore";
import CartItemsList from "@/app/components/cart/CartItemList";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CheckoutForm from "./UserCheckoutForm";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { CheckoutFormValues } from "@/lib/utils/formSchema";
import { useCheckoutStore } from "../../../../lib/store/userInformationStore";
import PaymentModule from "./PaymentModule";
import { useParams } from "next/navigation";

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
  const { clearFormData } = useCheckoutStore();
  const { totalPriceByStore } = useCartStore();
  const params = useParams();
  const store_slug = params.store_slug as string;
  
  const [isMounted, setIsMounted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const notify = useSheiNotification();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ FIXED: Use totalPriceByStore with the current store_slug
  const subtotal = isMounted ? totalPriceByStore(store_slug) : 0;

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

  const handleCheckoutSubmit = async (values: CheckoutFormValues) => {
    setIsProcessing(true);
    try {
      console.log("Checkout values:", values);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      notify.success("Shipping information saved!");
      nextStep();
    } catch (error) {
      notify.warning("Failed to save information. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    onCheckout();
    clearFormData();
  };

  const steps = [
    {
      title: "Cart Items",
      content: (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-3 text-foreground">
            Your Cart ({displayCount} items)
          </h2>

          {cartLength === 0 ? (
            <div className="text-center py-6 bg-card rounded-lg shadow-md">
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            <>
              <CartItemsList />
              <div className="flex justify-between mt-4 text-foreground border-border border rounded-lg p-3 bg-muted">
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
            </>
          )}
        </div>
      ),
    },
    {
      title: "Customer Information",
      content: (
        <div className="bg-card rounded-lg shadow-md p-4 mt-4 border-border">
          <h2 className="text-lg font-semibold mb-3 text-card-foreground">Customer Information</h2>
          <CheckoutForm
            onSubmit={handleCheckoutSubmit}
            isLoading={isProcessing}
          />
        </div>
      ),
    },
    {
      title: "Payment",
      content: (
        <div className="mt-4">
          <PaymentModule
            amount={subtotal}
            onSuccess={handlePaymentSuccess}
            onCancel={prevStep}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">Checkout</h1>
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={prevStep}
            disabled={activeStep === 0}
            variant="outline"
            className="flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft size={8} />
          </Button>

          {activeStep < steps.length - 1 ? (
            <Button
              onClick={nextStep}
              className="flex items-center gap-1 cursor-pointer"
            >
              <ChevronRight size={8} />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 mb-6">
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