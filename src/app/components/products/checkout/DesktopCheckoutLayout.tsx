/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useCartItems } from "@/lib/hook/useCartItems";
import { motion } from "framer-motion";
import CartItemsList from "@/app/components/cart/CartItemList";
import CheckoutForm from "./UserCheckoutForm";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import PaymentModule from "./PaymentModule";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";
import { DesktopCheckoutSkeleton } from "../../skeletons/DesktopCheckoutSkeleton"; // Add this

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
  const params = useParams();
  const store_slug = params.store_slug as string;
  
  const [isMounted, setIsMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const notify = useSheiNotification();
  const { clearFormData } = useCheckoutStore();

  // Use the custom hook to get cart items with fresh data
  const { items: cartItems, calculations, loading } = useCartItems(store_slug);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCheckoutSubmit = async (values: any) => {
    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      notify.success("Congratulations! Order has placed");
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

  // ✅ REPLACED: Using custom skeleton
  if (loading) {
    return <DesktopCheckoutSkeleton />;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-foreground">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cart Items Card */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-card-foreground">
              Your Cart ({calculations.totalItems} items)
            </CardTitle>
            <div className="h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-lg shadow-yellow-500/30"></div>
          </CardHeader>
          <CardContent>
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            ) : (
              <CartItemsList />
            )}
            {cartItems.length > 0 && (
              <div className="space-y-3 mt-4">
                <div className="flex justify-between text-foreground border-border border rounded-lg p-3">
                  <span>Subtotal:</span>
                  <span>${calculations.subtotal.toFixed(2)}</span>
                </div>
                {calculations.totalDiscount > 0 && (
                  <div className="flex justify-between text-green-600 border-border border rounded-lg p-3">
                    <span>Discount:</span>
                    <span>-${calculations.totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground border-t border-border pt-3">
                  <span>Total:</span>
                  <motion.span
                    key={`total-${calculations.totalPrice}`}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    ${calculations.totalPrice.toFixed(2)}
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
            amount={calculations.totalPrice}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowPaymentModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DesktopCheckout;