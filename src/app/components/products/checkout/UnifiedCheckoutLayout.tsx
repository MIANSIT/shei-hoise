/* eslint-disable @typescript-eslint/no-explicit-any */
// app/components/products/checkout/UnifiedCheckoutLayout.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, User, ChevronRight, ChevronLeft } from "lucide-react";
import CartItemsList from "../../cart/CartItemList";
import CheckoutForm from "./UserCheckoutForm";
import ShippingMethod from "./ShippingMethod";
import { CartProductWithDetails, CartCalculations } from "@/lib/types/cart";
import useCartStore from "@/lib/store/cartStore";
import { CustomerCheckoutFormValues } from "@/lib/schema/checkoutSchema";

interface UnifiedCheckoutLayoutProps {
  storeSlug: string;
  cartItems: CartProductWithDetails[];
  calculations: CartCalculations;
  loading: boolean;
  error: string | null;
  onCheckout: (values: CustomerCheckoutFormValues) => void;
  onShippingChange: (method: string, fee: number) => void;
  selectedShipping: string;
  shippingFee: number;
  isProcessing: boolean;
  mode?: "checkout" | "confirm";
}

export default function UnifiedCheckoutLayout({
  storeSlug,
  cartItems,
  calculations,
  loading,
  error,
  onCheckout,
  onShippingChange,
  selectedShipping,
  shippingFee,
  isProcessing,
  mode = "checkout",
}: UnifiedCheckoutLayoutProps) {
  const [activeSection, setActiveSection] = useState<"cart" | "customer">(
    "cart"
  );
  const [isClearing, setIsClearing] = useState(false);

  // Get cart store functions for checkout mode
  const { removeItem, updateQuantity, clearStoreCart } = useCartStore();

  // Calculate total with shipping
  const totalWithShipping = calculations.totalPrice + shippingFee;

  // Handle quantity changes
  const handleQuantityChange = (
    productId: string,
    variantId: string | null,
    newQuantity: number
  ) => {
    if (mode === "checkout") {
      updateQuantity(productId, variantId, newQuantity);
    }
    // In confirm mode, we don't update the cart as it's from URL
  };

  // Handle item removal
  const handleRemoveItem = (productId: string, variantId: string | null) => {
    if (mode === "checkout") {
      removeItem(productId, variantId);
    }
    // In confirm mode, we don't update the cart as it's from URL
  };

  // Handle cart clearing
  const handleClearCart = () => {
    if (mode === "checkout") {
      setIsClearing(true);
      clearStoreCart(storeSlug);
      setTimeout(() => setIsClearing(false), 300);
    }
    // In confirm mode, we don't update the cart as it's from URL
  };

  // Show error state
  if (error) {
    return (
      <div className='container mx-auto p-4 lg:p-8'>
        <div className='text-center py-12'>
          <div className='bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto'>
            <div className='text-red-500 text-6xl mb-4'>⚠️</div>
            <h2 className='text-xl font-bold text-red-800 mb-2'>
              Invalid Order Data
            </h2>
            <p className='text-red-600 mb-4'>{error}</p>
            <p className='text-sm text-muted-foreground'>
              Please check your order link or try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading && cartItems.length === 0) {
    return (
      <div className='container mx-auto p-4 lg:p-8'>
        <div className='text-center py-12'>
          <div className='animate-pulse'>
            <div className='h-8 bg-gray-200 rounded w-64 mx-auto mb-6'></div>
            <div className='h-4 bg-gray-200 rounded w-48 mx-auto mb-8'></div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
              <div className='bg-gray-100 rounded-lg h-96'></div>
              <div className='bg-gray-100 rounded-lg h-96'></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-4 lg:p-8 pb-20 lg:pb-8'>
      {/* Header */}
      <div className='text-center lg:text-left mb-6 lg:mb-8'>
        <h1 className='text-2xl lg:text-3xl font-bold text-foreground'>
          {mode === "confirm" ? "Confirm Your Order" : "Checkout"}
        </h1>
        <p className='text-sm lg:text-base text-muted-foreground mt-2'>
          {mode === "confirm"
            ? "Review your items and enter your details"
            : "Complete your purchase"}
        </p>
      </div>

      {/* Progress Indicator - Mobile Only */}
      <div className='lg:hidden mb-6'>
        <div className='flex items-center justify-between text-sm mb-2'>
          <button
            onClick={() => setActiveSection("cart")}
            className={`flex items-center gap-1 ${
              activeSection === "cart"
                ? "text-yellow-600 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeSection === "customer" && (
              <ChevronLeft className='h-4 w-4' />
            )}
            Cart
          </button>
          <button
            onClick={() => setActiveSection("customer")}
            className={`flex items-center gap-1 ${
              activeSection === "customer"
                ? "text-yellow-600 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Details
            {activeSection === "cart" && <ChevronRight className='h-4 w-4' />}
          </button>
        </div>
        <div className='w-full bg-gray-200 rounded-full h-2'>
          <div
            className='bg-yellow-500 h-2 rounded-full transition-all duration-300'
            style={{ width: activeSection === "cart" ? "50%" : "100%" }}
          ></div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8'>
        {/* Cart Items Card */}
        <div
          className={`${
            activeSection === "customer" ? "hidden lg:block" : "block"
          }`}
        >
          <Card className='bg-card lg:sticky lg:top-8'>
            <CardHeader className='pb-4'>
              <div className='flex items-center gap-3'>
                <div className='bg-yellow-100 p-2 rounded-full'>
                  <ShoppingBag className='h-5 w-5 text-yellow-600' />
                </div>
                <div>
                  <CardTitle className='text-lg lg:text-xl font-semibold text-card-foreground'>
                    Your Order
                  </CardTitle>
                  <p className='text-sm text-muted-foreground'>
                    {calculations.totalItems}{" "}
                    {calculations.totalItems === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
              <div className='h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-lg shadow-yellow-500/30 mt-2'></div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {cartItems.length === 0 ? (
                <div className='text-center py-8'>
                  <ShoppingBag className='h-12 w-12 text-muted-foreground mx-auto mb-3' />
                  <p className='text-muted-foreground'>
                    No products found in your order
                  </p>
                </div>
              ) : (
                <div className='max-h-[400px] lg:max-h-[500px] overflow-y-auto'>
                  <CartItemsList
                    items={cartItems}
                    onQuantityChange={
                      mode === "checkout" ? handleQuantityChange : undefined
                    }
                    onRemoveItem={
                      mode === "checkout" ? handleRemoveItem : undefined
                    }
                    onClearCart={
                      mode === "checkout" ? handleClearCart : undefined
                    }
                    isClearing={isClearing}
                    showStoreInfo={mode === "checkout"}
                    storeSlug={storeSlug}
                  />
                </div>
              )}

              {cartItems.length > 0 && (
                <div className='space-y-3 pt-4 border-t border-border'>
                  <div className='flex justify-between text-foreground'>
                    <span>Subtotal:</span>
                    <span>৳{calculations.subtotal.toFixed(2)}</span>
                  </div>

                  {/* Shipping Method */}
                  <div className='border-t border-border pt-3'>
                    <ShippingMethod
                      storeSlug={storeSlug}
                      subtotal={calculations.subtotal}
                      selectedShipping={selectedShipping}
                      onShippingChange={onShippingChange}
                    />
                  </div>

                  <div className='flex justify-between font-bold text-foreground text-lg pt-3 border-t border-border'>
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

                  {/* Continue to Details Button - Mobile Only */}
                  <Button
                    className='w-full lg:hidden bg-yellow-500 hover:bg-yellow-600 text-white mt-4'
                    onClick={() => setActiveSection("customer")}
                  >
                    Continue to Details
                    <ChevronRight className='h-4 w-4 ml-2' />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer Information Card */}
        <div
          className={`${
            activeSection === "cart" ? "hidden lg:block" : "block"
          }`}
        >
          <div className='space-y-6'>
            <Card className='bg-card'>
              <CardHeader className='pb-4'>
                <div className='flex items-center gap-3'>
                  <div className='bg-blue-100 p-2 rounded-full'>
                    <User className='h-5 w-5 text-blue-600' />
                  </div>
                  <div>
                    <CardTitle className='text-lg lg:text-xl font-semibold text-card-foreground'>
                      Customer Information
                    </CardTitle>
                    <p className='text-sm text-muted-foreground'>
                      Shipping and contact details
                    </p>
                  </div>
                </div>
                <div className='h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full shadow-lg shadow-blue-500/30 mt-2'></div>
              </CardHeader>
              <CardContent>
                <CheckoutForm
                  onSubmit={onCheckout}
                  isLoading={isProcessing}
                  shippingMethod={selectedShipping}
                  shippingFee={shippingFee}
                  totalAmount={totalWithShipping}
                  mode={mode}
                />

                {/* Back Button - Mobile Only */}
                <Button
                  variant='outline'
                  className='w-full lg:hidden mt-4'
                  onClick={() => setActiveSection("cart")}
                >
                  <ChevronLeft className='h-4 w-4 mr-2' />
                  Back to Cart
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
