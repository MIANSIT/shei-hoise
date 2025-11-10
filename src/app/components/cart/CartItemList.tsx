"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { CartProductWithDetails } from "@/lib/types/cart";

interface CartItemsListProps {
  items?: CartProductWithDetails[];
  onQuantityChange?: (productId: string, variantId: string | null, newQuantity: number) => void;
  onRemoveItem?: (productId: string, variantId: string | null) => void;
  onClearCart?: () => void;
  isClearing?: boolean;
  showStoreInfo?: boolean;
  storeSlug?: string;
}

export default function CartItemsList({
  items = [],
  onQuantityChange,
  onRemoveItem,
  onClearCart,
  isClearing = false,
  showStoreInfo = true,
  storeSlug,
}: CartItemsListProps) {
  const params = useParams();
  const currentStoreSlug = storeSlug || (params.store_slug as string);
  
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [changingQuantities, setChangingQuantities] = useState<Record<string, "up" | "down">>({});

  console.log("📦 CartItemsList Debug:", {
    receivedItems: items,
    itemsCount: items.length,
    currentStoreSlug
  });

  const handleQuantityChange = (productId: string, variantId: string | null | undefined, currentQuantity: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const direction = newQuantity > currentQuantity ? "up" : "down";
    const itemKey = `${productId}-${variantId || 'no-variant'}`;
    
    setChangingQuantities((prev) => ({ ...prev, [itemKey]: direction }));

    if (onQuantityChange) {
      onQuantityChange(productId, variantId ?? null, newQuantity);
    }
    
    setTimeout(() => {
      setChangingQuantities((prev) => {
        const newState = { ...prev };
        delete newState[itemKey];
        return newState;
      });
    }, 300);
  };

  const handleRemoveItem = (productId: string, variantId: string | null | undefined) => {
    const itemKey = `${productId}-${variantId || 'no-variant'}`;
    setRemovingIds(prev => new Set(prev).add(itemKey));
    
    if (onRemoveItem) {
      onRemoveItem(productId, variantId ?? null);
    }
    
    setTimeout(() => {
      setRemovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }, 300);
  };

  // If no items provided, show empty state
  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-center py-8 text-muted-foreground">
          <p>Your cart is empty</p>
          <p className="text-sm mt-1">Add some products to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showStoreInfo && currentStoreSlug && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Shopping at: <span className="font-medium text-foreground">{currentStoreSlug}</span>
          </p>
          {onClearCart && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive/80 text-sm"
              onClick={onClearCart}
              disabled={isClearing}
            >
              {isClearing ? "Clearing..." : `Clear Cart`}
            </Button>
          )}
        </div>
      )}

      {items.map((item) => {
        const itemKey = `${item.productId}-${item.variantId || 'no-variant'}`;
        const isRemoving = removingIds.has(itemKey);
        const isChangingQuantity = changingQuantities[itemKey];

        console.log("🛍️ Rendering cart item:", {
          itemKey,
          productName: item.productName,
          quantity: item.quantity,
          price: item.displayPrice
        });

        return (
          <div
            key={itemKey}
            className={`relative flex items-center justify-between rounded-lg bg-card/50 p-3 transition-all duration-300 ease-in-out border border-border ${
              isRemoving || isClearing ? "opacity-0 -translate-x-10" : "opacity-100 translate-x-0"
            }`}
          >
            {/* Rest of your cart item rendering code */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                <Image
                  src={item.imageUrl}
                  alt={item.productName}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.png";
                  }}
                />
              </div>
              <div className="flex flex-col">
                <h3 className="font-medium text-foreground md:text-xs text-sm">
                  {item.productName}
                </h3>
                
                {item.variant && (
                  <div className="space-y-1 mt-1">
                    {item.variant.variant_name && (
                      <p className="text-sm text-muted-foreground">
                        {item.variant.variant_name}
                      </p>
                    )}
                    {item.variant.color && (
                      <p className="text-sm text-muted-foreground">
                        Color: {item.variant.color}
                      </p>
                    )}
                  </div>
                )}
                
                {item.product?.category?.name && (
                  <p className="text-sm text-muted-foreground">
                    {item.product.category.name}
                  </p>
                )}

                <p className="text-sm text-muted-foreground">
                  ৳{item.displayPrice.toFixed(2)} each
                  {item.discountPercentage > 0 && (
                    <span className="line-through text-xs ml-1">
                      ৳{item.originalPrice.toFixed(2)}
                    </span>
                  )}
                </p>

                {item.isOutOfStock ? (
                  <p className="text-sm text-destructive mt-1">Out of Stock</p>
                ) : item.stock < 10 ? (
                  <p className="text-sm text-yellow-600 mt-1">Only {item.stock} left</p>
                ) : null}

                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent"
                    onClick={() => handleQuantityChange(item.productId, item.variantId, item.quantity, item.quantity - 1)}
                    disabled={item.quantity <= 1 || isClearing || item.isOutOfStock}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>

                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={item.quantity}
                        initial={{ 
                          y: isChangingQuantity === "up" ? -20 : 20, 
                          opacity: 0 
                        }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ 
                          y: isChangingQuantity === "up" ? 20 : -20, 
                          opacity: 0 
                        }}
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
                    onClick={() => handleQuantityChange(item.productId, item.variantId, item.quantity, item.quantity + 1)}
                    disabled={isClearing || item.isOutOfStock || item.quantity >= item.stock}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-end flex-col gap-8">
              {onRemoveItem && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="group h-8 w-8 cursor-pointer hover:bg-destructive/10 transition-colors"
                  onClick={() => handleRemoveItem(item.productId, item.variantId)}
                  aria-label="Remove item"
                  disabled={isClearing}
                >
                  <Trash2 className="h-4 w-4 text-destructive group-hover:text-destructive/80 transition-colors" />
                </Button>
              )}

              <motion.p
                className="text-foreground font-medium"
                key={`price-${itemKey}-${item.quantity}`}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                ৳{(item.displayPrice * item.quantity).toFixed(2)}
              </motion.p>
            </div>
          </div>
        );
      })}
    </div>
  );
}