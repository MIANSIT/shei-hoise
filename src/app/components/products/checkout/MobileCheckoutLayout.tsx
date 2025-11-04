"use client";

import { useState, useEffect } from "react";
import { useCartItems } from "@/lib/hook/useCartItems";
import CartItemsList from "@/app/components/cart/CartItemList";
import ShippingMethod from "./ShippingMethod";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import CheckoutForm from "./UserCheckoutForm";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { CheckoutFormValues } from "@/lib/utils/formSchema";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { useParams } from "next/navigation";
import { MobileCheckoutSkeleton } from "../../skeletons/MobileCheckoutSkeleton";

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
  const params = useParams();
  const store_slug = params.store_slug as string;

  const [isMounted, setIsMounted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  const notify = useSheiNotification();

  // Use the custom hook to get cart items with fresh data
  const { items: cartItems, calculations, loading } = useCartItems(store_slug);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleShippingChange = (shippingMethod: string, fee: number) => {
    setSelectedShipping(shippingMethod);
    setShippingFee(fee);
  };

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
      // The order processing now happens in CheckoutForm
      // Just show success message
      notify.success("Congratulations! Order has been placed");
      // The CheckoutForm will handle the redirect
    } catch (error) {
      notify.warning("Failed to save information. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate total with shipping
  const totalWithShipping = calculations.totalPrice + shippingFee;

  const steps = [
    {
      title: "Cart Items",
      content: (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-3 text-foreground">
            Your Cart ({calculations.totalItems} items)
          </h2>
          {cartItems.length === 0 ? (
            <div className="text-center py-6 bg-card rounded-lg shadow-md">
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            <>
              <CartItemsList />
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-foreground border-border border rounded-lg p-3 bg-muted">
                  <span>Subtotal:</span>
                  <span>৳{calculations.subtotal.toFixed(2)}</span>
                </div>
                <ShippingMethod
                  storeSlug={store_slug}
                  subtotal={calculations.subtotal}
                  selectedShipping={selectedShipping}
                  onShippingChange={handleShippingChange}
                />

                <div className="flex justify-between font-bold text-foreground border-t border-border pt-3">
                  <span>Total:</span>
                  <motion.span
                    key={`total-${totalWithShipping}`}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    ৳{totalWithShipping.toFixed(2)}
                  </motion.span>
                </div>

                {/* Continue to Details Button - Only show on cart step */}
                <Button
                  onClick={nextStep}
                  className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 cursor-pointer"
                  disabled={cartItems.length === 0}
                >
                  Continue to Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </div>
      ),
    },
    {
      title: "Shipping & Details",
      content: (
        <div className="space-y-4 mt-4">
          {/* Customer Information */}
          <div className="bg-card rounded-lg shadow-md p-4 border-border">
            <h2 className="text-lg font-semibold mb-3 text-card-foreground">
              Customer Information
            </h2>
            <CheckoutForm
              onSubmit={handleCheckoutSubmit}
              isLoading={isProcessing}
              shippingMethod={selectedShipping}
              shippingFee={shippingFee}
              totalAmount={totalWithShipping}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-4">
            <Button
              onClick={prevStep}
              variant="outline"
              className="flex-1 cursor-pointer"
            >
              Back to Cart
            </Button>
          </div>
        </div>
      ),
    },
  ];

  // ✅ REPLACED: Using custom skeleton
  if (loading && activeStep === 0) {
    return <MobileCheckoutSkeleton />;
  }

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
              disabled={cartItems.length === 0 && activeStep === 0}
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
