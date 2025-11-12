"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useCartItems } from "@/lib/hook/useCartItems";
import CartItemsList from "./CartItemList";
import { Button } from "@/components/ui/button";
import CartCheckoutLayout from "./CartCheckoutLayout";
import { useRouter, useParams } from "next/navigation";
import useCartStore from "@/lib/store/cartStore";

type CartSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const params = useParams();
  const store_slug = params.store_slug as string;
  const router = useRouter();

  // Use the custom hook to get cart items with fresh data
  const { items: cartItems, calculations, loading, error } = useCartItems(store_slug);
  
  // Get cart store functions for handling cart operations
  const { removeItem, updateQuantity, clearStoreCart, getCartByStore } = useCartStore();

  // Debug: Check what's in the cart
  useEffect(() => {
    if (isOpen) {
      console.log("🛒 CartSidebar Debug:", {
        store_slug,
        cartItems,
        calculations,
        loading,
        error,
        rawCart: getCartByStore(store_slug),
        cartItemsLength: cartItems.length
      });
    }
  }, [isOpen, store_slug, cartItems, calculations, loading, error, getCartByStore]);

  // Prevent background scrolling when sidebar is open
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
    onClose();
    router.push(`/${store_slug}/checkout`);
  };

  const handleContinueShopping = () => {
    onClose();
    router.push(`/${store_slug}`);
  };

  const handleQuantityChange = (productId: string, variantId: string | null, newQuantity: number) => {
    console.log("🔄 Changing quantity:", { productId, variantId, newQuantity });
    updateQuantity(productId, variantId, newQuantity);
  };

  const handleRemoveItem = (productId: string, variantId: string | null) => {
    console.log("🗑️ Removing item:", { productId, variantId });
    removeItem(productId, variantId);
  };

  const handleClearCart = () => {
    console.log("🧹 Clearing cart for store:", store_slug);
    clearStoreCart(store_slug);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md text-foreground bg-background shadow-xl z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className='flex flex-col h-full'>
          <div className='flex items-center justify-between p-4 border-b border-border'>
            <h2 className='text-lg font-semibold'>
              Your Cart ({calculations.totalItems})
            </h2>
            <button
              onClick={onClose}
              className='p-1 rounded-md hover:bg-accent cursor-pointer transition-colors'
              aria-label='Close cart'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
          
          <div className='flex-1 p-4 overflow-y-auto'>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading cart...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-destructive">Error: {error}</p>
                <Button
                  className="mt-4 w-full"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            ) : cartItems.length === 0 ? (
              <div className='text-center py-8'>
                <p className='text-muted-foreground'>Your cart is empty</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add some products to get started!
                </p>
                <Button
                  className="mt-4 w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-primary-foreground hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300"
                  onClick={handleContinueShopping}
                >
                  Continue Shopping at {store_slug}
                </Button>
              </div>
            ) : (
              <CartItemsList 
                items={cartItems}
                onQuantityChange={handleQuantityChange}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                showStoreInfo={false}
                storeSlug={store_slug}
              />
            )}
          </div>

          {!loading && !error && cartItems.length > 0 && (
            <CartCheckoutLayout
              subtotal={calculations.totalPrice}
              onCheckout={handleCheckout}
              buttonText="Proceed to Checkout"
            />
          )}
        </div>
      </div>
    </>
  );
}