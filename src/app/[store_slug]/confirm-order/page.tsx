/* eslint-disable @typescript-eslint/no-explicit-any */
// app/confirm-order/page.tsx - UPDATED WITH COMPRESSION
"use client";
import { useSearchParams, useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useCartItems } from "@/lib/hook/useCartItems";
import { motion } from "framer-motion";
import CheckoutForm from "../../components/products/checkout/UserCheckoutForm";
import ShippingMethod from "../../components/products/checkout/ShippingMethod";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCheckoutStore } from "@/lib/store/userInformationStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CartItemsList from "../../components/cart/CartItemList";
import { DesktopCheckoutSkeleton } from "../../components/skeletons/DesktopCheckoutSkeleton";
import useCartStore from "@/lib/store/cartStore";
import { Button } from "@/components/ui/button";
import { ShoppingBag, User } from "lucide-react";
import { decompressFromEncodedURIComponent } from "lz-string";

export default function ConfirmOrderPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const compressedData = searchParams.get("o"); // Get compressed data
  const store_slug = params.store_slug as string;

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [parsingError, setParsingError] = useState<string | null>(null);

  const notify = useSheiNotification();
  const { clearFormData } = useCheckoutStore();
  const { clearStoreCart, addToCart } = useCartStore();

  // Use the existing custom hook
  const {
    items: cartItems,
    calculations,
    loading,
  } = useCartItems(store_slug);

  // Refs to track state
  const initializationAttempted = useRef(false);

  // Parse compressed data and populate cart store
  useEffect(() => {
    if (!compressedData || initializationAttempted.current) {
      if (!compressedData) {
        setParsingError("No order data found in the link");
      }
      return;
    }

    const initializeCart = async () => {
      try {
        initializationAttempted.current = true;
        
        // Decompress the data
        const decompressed = decompressFromEncodedURIComponent(compressedData);
        if (!decompressed) {
          throw new Error("Failed to decompress order data");
        }

        const compactProducts: Array<[string, string | undefined, number]> = JSON.parse(decompressed);

        if (!compactProducts || !Array.isArray(compactProducts) || compactProducts.length === 0) {
          setParsingError("Invalid order data format");
          return;
        }

        // Convert compact format to full format
        const parsedProducts = compactProducts.map(item => ({
          product_id: item[0],
          variant_id: item[1] || undefined,
          quantity: item[2]
        }));

        // Clear existing cart for this store
        clearStoreCart(store_slug);

        // Add each product to cart
        for (const product of parsedProducts) {
          await addToCart({
            productId: product.product_id,
            variantId: product.variant_id,
            quantity: product.quantity,
            storeSlug: store_slug,
          });
        }

        notify.success("Order loaded successfully!");
      } catch (error) {
        console.error("Cart initialization failed:", error);
        setParsingError("Failed to load order data. The link may be invalid or expired.");
        notify.warning("Failed to load order data");
      }
    };

    initializeCart();
  }, [compressedData, store_slug, clearStoreCart, addToCart, notify]);

  const handleShippingChange = (shippingMethod: string, fee: number) => {
    setSelectedShipping(shippingMethod);
    setShippingFee(fee);
  };

  const handleCheckoutSubmit = async (values: any) => {
    setIsProcessing(true);
    try {
      notify.success("Congratulations! Order has been placed");
    } catch (error) {
      notify.warning("Failed to save information. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate total with shipping
  const totalWithShipping = calculations.totalPrice + shippingFee;

  // Show error state
  if (parsingError) {
    return (
      <div className="container mx-auto p-4 lg:p-8">
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-800 mb-2">Invalid Order Link</h2>
            <p className="text-red-600 mb-4">{parsingError}</p>
            <p className="text-sm text-muted-foreground">
              Please ask the seller to generate a new order link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading && cartItems.length === 0) {
    return <DesktopCheckoutSkeleton />;
  }

  return (
    <div className="container mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="text-center lg:text-left mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Confirm Your Order
        </h1>
        <p className="text-sm lg:text-base text-muted-foreground mt-2">
          Review your items and enter your details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Cart Items Card */}
        <div>
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

                  {/* Shipping Method */}
                  <div className="border-t border-border pt-3">
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer Information Card */}
        <div>
          <div className="space-y-6">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}