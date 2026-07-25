"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { useCartItems } from "@/lib/hook/useCartItems";
import CartItemsList from "./CartItemList";
import CartCheckoutLayout from "./CartCheckoutLayout";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import useCartStore from "@/lib/store/cartStore"; // Import cart store
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

type CartBottomBarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CartBottomBar({ isOpen, onClose }: CartBottomBarProps) {
  const params = useParams();
  const store_slug = params.store_slug as string;
  const router = useRouter();

  // Use the custom hook to get cart items with fresh data
  const { items: cartItems, calculations, loading, error } = useCartItems(store_slug);
  
  // Get cart store functions for handling cart operations
  const { removeItem, updateQuantity, clearStoreCart } = useCartStore();
  const t = useTranslation();
  const n = useLocalNum();

  // Debug: Check what's in the cart
  useEffect(() => {
    if (isOpen) {
     
    }
  }, [isOpen, store_slug, cartItems, calculations, loading, error]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const handleCheckout = () => {
    onClose(); // Close the cart drawer first
    router.push(`/${store_slug}/checkout`);
  };

  const handleContinueShopping = () => {
    onClose();
    router.push(`/${store_slug}`);
  };

  // Handle quantity changes in cart
  const handleQuantityChange = (
    productId: string,
    variantId: string | null,
    newQuantity: number,
    bundleSelections?: Record<string, string> | null
  ) => {
    updateQuantity(productId, variantId, newQuantity, bundleSelections);
  };

  // Handle item removal from cart
  const handleRemoveItem = (
    productId: string,
    variantId: string | null,
    bundleSelections?: Record<string, string> | null
  ) => {
    removeItem(productId, variantId, bundleSelections);
  };

  // Handle clearing entire cart for this store
  const handleClearCart = () => {
    clearStoreCart(store_slug);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 bg-background text-foreground shadow-lg z-50 transition-transform duration-300 ease-in-out lg:hidden rounded-tl-2xl rounded-tr-2xl border-t border-border ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {t.cart.yourCart} ({n(calculations.totalItems)})
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-accent cursor-pointer transition-colors"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto pb-4">
            {loading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">{t.cart.loadingCart}</p>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-destructive">{t.cart.errorPrefix} {error}</p>
                <Button
                  className="mt-4 w-full"
                  onClick={() => window.location.reload()}
                >
                  {t.cart.retry}
                </Button>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">{t.cart.cartEmpty}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t.cart.addProductsPrompt}
                </p>
                <Button
                  className="mt-4 w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-primary-foreground hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300"
                  onClick={handleContinueShopping}
                >
                  {t.cart.continueShoppingAt} {store_slug}
                </Button>
              </div>
            ) : (
              <CartItemsList 
                items={cartItems}
                onQuantityChange={handleQuantityChange}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                showStoreInfo={false} // Since we're in a specific store's context
                storeSlug={store_slug}
              />
            )}
          </div>
          
          {!loading && !error && cartItems.length > 0 && (
            <CartCheckoutLayout
              subtotal={calculations.totalPrice}
              onCheckout={handleCheckout}
              buttonText={t.cart.proceedToCheckout}
            />
          )}
        </div>
      </div>
    </>
  );
}