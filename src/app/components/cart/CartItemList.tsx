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
    cart
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
  }, [store_slug, getCartByStore, cart]);

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

  // ✅ NEW: Get display image - prioritize variant images
  const getDisplayImage = (item: CartItem): string => {
    // Use variant image if available
    if (item.variant_data?.product_images?.[0]?.image_url) {
      return item.variant_data.product_images[0].image_url;
    }
    if (item.variant_data?.primary_image?.image_url) {
      return item.variant_data.primary_image.image_url;
    }
    // Fallback to product image
    return item.imageUrl || "/placeholder.png";
  };

  // ✅ NEW: Get display name with variant info
  const getDisplayName = (item: CartItem): string => {
    if (item.variant_data?.variant_name) {
      return `${item.name} - ${item.variant_data.variant_name}`;
    }
    if (item.variant_data?.color) {
      return `${item.name} - ${item.variant_data.color}`;
    }
    return item.name;
  };

  // ✅ NEW: Get variant details for display
  const getVariantDetails = (item: CartItem): string | null => {
    if (item.variant_data) {
      const details = [];
      if (item.variant_data.color) details.push(item.variant_data.color);
      if (item.variant_data.size) details.push(item.variant_data.size);
      return details.join(' • ');
    }
    return null;
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
    storeCartItems: storeCart.map(item => ({
      id: item.id,
      variant_id: item.variant_id,
      name: item.name,
      variant_data: item.variant_data
    }))
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
          // ✅ FIXED: Use the new helper functions
          const displayPrice = getDisplayPrice(item);
          const displayImage = getDisplayImage(item);
          const displayName = getDisplayName(item);
          const variantDetails = getVariantDetails(item);

          // ✅ DEBUG: Log detailed item info
          console.log('🛒 Cart item details:', {
            name: item.name,
            product_id: item.id,
            variant_id: item.variant_id,
            variant_data: item.variant_data,
            displayName,
            displayImage,
            variantDetails,
            price: displayPrice,
            quantity: item.quantity
          });

          return (
            <div
              key={`${item.id}-${item.variant_id || 'no-variant'}`} // ✅ Use composite key
              className={`relative flex items-center justify-between rounded-lg bg-card/50 p-3 transition-all duration-300 ease-in-out border border-border ${
                removingId === item.id || isClearing ? "opacity-0 -translate-x-10" : "opacity-100 translate-x-0"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                  <Image
                    src={displayImage}
                    alt={displayName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  {/* ✅ Use display name with variant info */}
                  <h3 className="font-medium text-foreground md:text-xs text-sm">
                    {displayName}
                  </h3>
                  
                  {/* ✅ Show variant details if available */}
                  {variantDetails && (
                    <p className="text-sm text-muted-foreground">
                      {variantDetails}
                    </p>
                  )}
                  
                  {/* ✅ Show category if available */}
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