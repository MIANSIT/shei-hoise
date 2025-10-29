"use client";

import { useState, useEffect } from "react";
import useCartStore from "@/lib/store/cartStore";
import CartItemsList from "@/app/components/cart/CartItemList";
import { motion } from "framer-motion";
import CheckoutForm from "./UserCheckoutForm";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { CheckoutFormValues } from "@/lib/utils/formSchema";
import { useCheckoutStore } from "../../../../lib/store/userInformationStore";
import PaymentModule from "./PaymentModule";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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
      setShowPaymentModal(true);
    } catch (error) {
      notify.warning("Failed to save information. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    onCheckout();
    clearFormData();
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-foreground">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cart Items Card */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-card-foreground">
              Your Cart ({displayCount} items)
            </CardTitle>
            <div className="h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-lg shadow-yellow-500/30"></div>
          </CardHeader>
          <CardContent>
            {cartLength === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            ) : (
              <CartItemsList />
            )}
            {cartLength > 0 && (
              <div>
                <div className="flex justify-between mt-4 text-foreground border-border border rounded-lg p-3">
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
          </CardContent>
        </Card>
        
        {/* Customer Information Card */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-card-foreground">
              Customer Information
            </CardTitle>
            <div className="h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-lg shadow-yellow-500/30"></div>
          </CardHeader>
          <CardContent>
            <CheckoutForm
              onSubmit={handleCheckoutSubmit}
              isLoading={isProcessing}
            />
          </CardContent>
        </Card>
      </div>

      {/* Payment Modal using Shadcn Dialog */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-[625px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-card-foreground">
              Payment
            </DialogTitle>
          </DialogHeader>
          <PaymentModule
            amount={subtotal}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowPaymentModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DesktopCheckout;