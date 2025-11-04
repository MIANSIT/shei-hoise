/* eslint-disable @typescript-eslint/no-explicit-any */
// app/confirm-order/page.tsx - UPDATED WITH SHIPPING
"use client";
import { useSearchParams, useParams } from "next/navigation";
import { parseConfirmOrder } from "@/lib/utils/parseConfirmOrder";
import { useState, useEffect, useRef } from "react";
import { useCartItems } from "@/lib/hook/useCartItems";
import { motion } from "framer-motion";
import CheckoutForm from "../../components/products/checkout/UserCheckoutForm";
import ShippingMethod from "../../components/products/checkout/ShippingMethod"; // Add this import
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CartItemsList from "../../components/cart/CartItemList";
import { DesktopCheckoutSkeleton } from "../../components/skeletons/DesktopCheckoutSkeleton";
import useCartStore from "@/lib/store/cartStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ShoppingBag, User } from "lucide-react";

export default function ConfirmOrderPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const products = searchParams.getAll("product");
  const store_slug = params.store_slug as string;

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSection, setActiveSection] = useState<"cart" | "customer">(
    "cart"
  );
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [shippingFee, setShippingFee] = useState<number>(0);

  const notify = useSheiNotification();
  const { clearFormData } = useCheckoutStore();
  const { clearStoreCart, addToCart, getCartByStore } = useCartStore();

  // Use the existing custom hook
  const {
    items: cartItems,
    calculations,
    loading,
    error,
  } = useCartItems(store_slug);

  // Refs to track state
  const initializationAttempted = useRef(false);

  // Parse URL products and populate cart store - RUN ONLY ONCE
  useEffect(() => {
    if (products.length === 0 || initializationAttempted.current) {
      return;
    }

    const initializeCart = async () => {
      try {
        initializationAttempted.current = true;
        const parsedProducts = parseConfirmOrder(products);

        // Clear existing cart for this store
        clearStoreCart(store_slug);

        // Add each product from URL to cart
        for (const product of parsedProducts) {
          await addToCart({
            productId: product.productId,
            variantId: product.variantId,
            quantity: product.quantity,
            storeSlug: store_slug,
          });
        }
      } catch (error) {
        console.error("Cart initialization failed:", error);
      }
    };

    initializeCart();
  }, [products, store_slug, clearStoreCart, addToCart, getCartByStore]);

  const handleShippingChange = (shippingMethod: string, fee: number) => {
    setSelectedShipping(shippingMethod);
    setShippingFee(fee);
  };

  const handleCheckoutSubmit = async (values: any) => {
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

  // Show loading state
  if (loading && cartItems.length === 0) {
    return <DesktopCheckoutSkeleton />;
  }

  // Mobile section toggle component
  const MobileSectionToggle = () => (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-10 shadow-lg">
      <div className="flex gap-2">
        <Button
          className={`flex-1 flex items-center gap-2 ${
            activeSection === "cart"
              ? "bg-yellow-500 text-white hover:bg-yellow-600"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setActiveSection("cart")}
        >
          <ShoppingBag className="h-4 w-4" />
          Cart ({calculations.totalItems})
        </Button>
        <Button
          className={`flex-1 flex items-center gap-2 ${
            activeSection === "customer"
              ? "bg-yellow-500 text-white hover:bg-yellow-600"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setActiveSection("customer")}
        >
          <User className="h-4 w-4" />
          Details
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 lg:p-8 pb-20 lg:pb-8">
      {/* Header */}
      <div className="text-center lg:text-left mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Confirm Your Order
        </h1>
        <p className="text-sm lg:text-base text-muted-foreground mt-2">
          Review your items and enter your details
        </p>
      </div>

      {/* Progress Indicator - Mobile Only */}
      <div className="lg:hidden mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span
            className={
              activeSection === "cart"
                ? "text-yellow-600 font-semibold"
                : "text-muted-foreground"
            }
          >
            Cart
          </span>
          <span
            className={
              activeSection === "customer"
                ? "text-yellow-600 font-semibold"
                : "text-muted-foreground"
            }
          >
            Details
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
            style={{ width: activeSection === "cart" ? "50%" : "100%" }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Cart Items Card - Show on mobile when active */}
        <div
          className={`${
            activeSection === "cart" ? "block" : "hidden"
          } lg:block`}
        >
          <Card className="bg-card lg:sticky lg:top-8">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-full">
                  <ShoppingBag className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-lg lg:text-xl font-semibold text-card-foreground">
                    Your Order
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {calculations.totalItems}{" "}
                    {calculations.totalItems === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-lg shadow-yellow-500/30 mt-2"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No products found in your order
                  </p>
                </div>
              ) : (
                <div className="max-h-[400px] lg:max-h-[500px] overflow-y-auto">
                  <CartItemsList />
                </div>
              )}

              {cartItems.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex justify-between text-foreground">
                    <span>Subtotal:</span>
                    <span>৳{calculations.subtotal.toFixed(2)}</span>
                  </div>

                  <div
                    className={`${
                      activeSection === "cart" ? "lg:block hidden" : "block"
                    }`}
                  >
                    <ShippingMethod
                      storeSlug={store_slug}
                      subtotal={calculations.subtotal}
                      selectedShipping={selectedShipping}
                      onShippingChange={handleShippingChange}
                    />
                  </div>

                  <div className="flex justify-between font-bold text-foreground text-lg pt-3 border-t border-border">
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
                  {/* Continue Button - Mobile Only */}
                  <Button
                    className="w-full lg:hidden bg-yellow-500 hover:bg-yellow-600 text-white mt-4"
                    onClick={() => setActiveSection("customer")}
                  >
                    Continue to Details
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer Information Card - Show on mobile when active */}
        <div
          className={`${
            activeSection === "customer" ? "block" : "hidden"
          } lg:block`}
        >
          <div className="space-y-6">
            {/* Shipping Method Component - Only show when cart section is active on mobile */}

            <Card className="bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg lg:text-xl font-semibold text-card-foreground">
                      Customer Information
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Shipping and contact details
                    </p>
                  </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full shadow-lg shadow-blue-500/30 mt-2"></div>
              </CardHeader>
              <CardContent>
                <CheckoutForm
                  onSubmit={handleCheckoutSubmit}
                  isLoading={isProcessing}
                  shippingMethod={selectedShipping}
                  shippingFee={shippingFee}
                  totalAmount={totalWithShipping}
                />

                {/* Back Button - Mobile Only */}
                {activeSection === "customer" && (
                  <Button
                    variant="outline"
                    className="w-full lg:hidden mt-4"
                    onClick={() => setActiveSection("cart")}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back to Cart
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileSectionToggle />
    </div>
  );
}
