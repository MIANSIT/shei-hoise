"use client";

import { CartItem } from "@/lib/types/cart";
import useCartStore from "@/lib/store/cartStore";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";

export default function CartItemsList() {
  const params = useParams();
  const store_slug = params.store_slug as string;
  
  const { 
    getCartByStore, 
    removeItem, 
    updateQuantity, 
    clearStoreCart,
    cart // ✅ Get the entire cart from Zustand to trigger re-renders
  } = useCartStore();
  
  const [storeCart, setStoreCart] = useState<CartItem[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [changingQuantities, setChangingQuantities] = useState<Record<string, "up" | "down">>({});

  // ✅ Update cart data when store_slug changes OR when the global cart changes
  useEffect(() => {
    const currentStoreCart = getCartByStore(store_slug);
    setStoreCart(currentStoreCart);
    console.log('🛒 CartItemsList - Store cart updated:', {
      store_slug,
      storeCart: currentStoreCart,
      globalCart: cart
    });
  }, [store_slug, getCartByStore, cart]); // ✅ Added cart as dependency

  // ✅ FIXED: Correct price display logic
  const getDisplayPrice = (item: CartItem): number => {
    // Priority order: discounted_price > currentPrice > base_price
    if (item.discounted_price && item.discounted_price > 0) {
      return item.discounted_price;
    }
    if (item.currentPrice && item.currentPrice > 0) {
      return item.currentPrice;
    }
    return item.base_price;
  };

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) return;
    const direction = newQuantity > item.quantity ? "up" : "down";
    setChangingQuantities((prev) => ({ ...prev, [item.id]: direction }));

    setTimeout(() => {
      updateQuantity(item.id, newQuantity);
      setChangingQuantities((prev) => {
        const newState = { ...prev };
        delete newState[item.id];
        return newState;
      });
    }, 300);
  };

  const handleRemoveItem = (id: string) => {
    setRemovingId(id);
    setTimeout(() => {
      removeItem(id);
      setRemovingId(null);
    }, 300);
  };

  const handleClearCart = () => {
    if (storeCart.length === 0) return;
    setIsClearing(true);
    setTimeout(() => {
      clearStoreCart(store_slug);
      setIsClearing(false);
    }, 300);
  };

  // Debug: Log when component renders
  console.log('🛒 CartItemsList - Rendering with:', {
    store_slug,
    storeCartLength: storeCart.length,
    storeCartItems: storeCart
  });

  return (
    <div className="space-y-3">
      {storeCart.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Shopping at: <span className="font-medium text-foreground">{store_slug}</span>
          </p>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive/80 text-sm"
            onClick={handleClearCart}
            disabled={isClearing}
          >
            {isClearing ? "Clearing..." : `Clear ${store_slug} Cart`}
          </Button>
        </div>
      )}

      {storeCart.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Your cart is empty</p>
          <p className="text-sm mt-1">Add some products from {store_slug} to get started!</p>
        </div>
      ) : (
        storeCart.map((item: CartItem) => {
          // ✅ FIXED: Use the correct price display logic
          const displayPrice = getDisplayPrice(item);
          const displayImage = item.imageUrl || "/placeholder.png";
          const variant = item.variants?.[0];
          const hasVariants = item.variants && item.variants.length > 0;

          // ✅ DEBUG: Log price calculation for each item
          console.log('🛒 Item price calculation:', {
            name: item.name,
            base_price: item.base_price,
            discounted_price: item.discounted_price,
            currentPrice: item.currentPrice,
            finalDisplayPrice: displayPrice,
            quantity: item.quantity,
            total: displayPrice * item.quantity
          });

          return (
            <div
              key={item.id}
              className={`relative flex items-center justify-between rounded-lg bg-card/50 p-3 transition-all duration-300 ease-in-out border border-border ${
                removingId === item.id || isClearing ? "opacity-0 -translate-x-10" : "opacity-100 translate-x-0"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                  <Image
                    src={displayImage}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-medium text-foreground md:text-xs text-sm">{item.name}</h3>
                  
                  {hasVariants && variant && (
                    <p className="text-sm text-muted-foreground">
                      {variant.variant_name} 
                      {variant.color && ` - ${variant.color}`}
                    </p>
                  )}
                  
                  {item.category?.name && (
                    <p className="text-sm text-muted-foreground">
                      {item.category.name}
                    </p>
                  )}

                  {/* ✅ Show price per item */}
                  <p className="text-sm text-muted-foreground">
                    ${displayPrice.toFixed(2)} each
                    {item.discounted_price && item.discounted_price < item.base_price && (
                      <span className="line-through text-xs ml-1">${item.base_price.toFixed(2)}</span>
                    )}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent"
                      onClick={() => handleQuantityChange(item, item.quantity - 1)}
                      disabled={item.quantity <= 1 || isClearing}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <div className="relative w-6 h-6 flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={item.quantity}
                          initial={{ y: changingQuantities[item.id] === "up" ? -20 : 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: changingQuantities[item.id] === "up" ? 20 : -20, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="absolute text-center text-foreground"
                        >
                          {item.quantity}
                        </motion.span>
                      </AnimatePresence>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent"
                      onClick={() => handleQuantityChange(item, item.quantity + 1)}
                      disabled={isClearing}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-end flex-col gap-8">
                <Button
                  variant="ghost"
                  size="icon"
                  className="group h-8 w-8 cursor-pointer hover:bg-destructive/10 transition-colors"
                  onClick={() => handleRemoveItem(item.id)}
                  aria-label="Remove item"
                  disabled={isClearing}
                >
                  <Trash2 className="h-4 w-4 text-destructive group-hover:text-destructive/80 transition-colors" />
                </Button>

                <motion.p
                  className="text-foreground font-medium"
                  key={`price-${item.id}-${item.quantity}`}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  ${(displayPrice * item.quantity).toFixed(2)}
                </motion.p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}