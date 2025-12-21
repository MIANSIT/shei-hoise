"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { CartProductWithDetails } from "@/lib/types/cart";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
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
   const {
    // currency,
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [changingQuantities, setChangingQuantities] = useState<Record<string, "up" | "down">>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [showMaxQuantityError, setShowMaxQuantityError] = useState<string | null>(null);
  const debounceRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Cleanup debounce timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceRefs.current).forEach(clearTimeout);
    };
  }, []);

  // Clear error message after 3 seconds
  useEffect(() => {
    if (showMaxQuantityError) {
      const timer = setTimeout(() => {
        setShowMaxQuantityError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showMaxQuantityError]);

  const handleQuantityChange = (productId: string, variantId: string | null | undefined, currentQuantity: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const itemKey = `${productId}-${variantId || 'no-variant'}`;
    const item = items.find(item => 
      `${item.productId}-${item.variantId || 'no-variant'}` === itemKey
    );
    
    // Check stock limit
    if (item && newQuantity > item.stock) {
      newQuantity = item.stock;
    }
    
    // Limit maximum quantity to 999
    if (newQuantity > 999) {
      newQuantity = 999;
    }

    const direction = newQuantity > currentQuantity ? "up" : "down";
    setChangingQuantities((prev) => ({ ...prev, [itemKey]: direction }));

    if (onQuantityChange) {
      onQuantityChange(productId, variantId ?? null, newQuantity);
    }
    
    // Clear input value when changing via buttons
    setInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[itemKey];
      return newValues;
    });
    
    setTimeout(() => {
      setChangingQuantities((prev) => {
        const newState = { ...prev };
        delete newState[itemKey];
        return newState;
      });
    }, 300);
  };


  const displayCurrencyIcon = currencyLoading ? null : currencyIcon ?? null;
  // const displayCurrency = currencyLoading ? "" : currency ?? "";
  const displayCurrencyIconSafe = displayCurrencyIcon || "৳"; // fallback

  const handleInputChange = (productId: string, variantId: string | null | undefined, value: string) => {
    const itemKey = `${productId}-${variantId || 'no-variant'}`;
    const item = items.find(item => 
      `${item.productId}-${item.variantId || 'no-variant'}` === itemKey
    );
    
    if (!item) return;

    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // Update input value immediately for responsive typing
    setInputValues(prev => ({
      ...prev,
      [itemKey]: numericValue
    }));

    // Clear existing debounce for this item
    if (debounceRefs.current[itemKey]) {
      clearTimeout(debounceRefs.current[itemKey]);
    }

    // If empty or invalid, don't update quantity yet
    if (!numericValue || numericValue === '0') {
      return;
    }

    let newQuantity = parseInt(numericValue, 10);
    
    // Validate quantity
    if (isNaN(newQuantity) || newQuantity < 1) {
      return;
    }

    // Check stock limit and show error if exceeded
    if (newQuantity > item.stock) {
      newQuantity = item.stock;
      // Update input to show the corrected value
      setInputValues(prev => ({
        ...prev,
        [itemKey]: item.stock.toString()
      }));
      // Show error message
      setShowMaxQuantityError(itemKey);
    }
    
    // Limit maximum quantity to 999
    if (newQuantity > 999) {
      newQuantity = 999;
      setInputValues(prev => ({
        ...prev,
        [itemKey]: '999'
      }));
    }

    // Debounce the quantity update to avoid too many rapid API calls
    debounceRefs.current[itemKey] = setTimeout(() => {
      if (onQuantityChange) {
        const currentItem = items.find(item => 
          `${item.productId}-${item.variantId || 'no-variant'}` === itemKey
        );
        
        // Only update if quantity actually changed from the current value
        if (currentItem && newQuantity !== currentItem.quantity) {
          const direction = newQuantity > currentItem.quantity ? "up" : "down";
          setChangingQuantities((prev) => ({ ...prev, [itemKey]: direction }));
          
          onQuantityChange(productId, variantId ?? null, newQuantity);
          
          setTimeout(() => {
            setChangingQuantities((prev) => {
              const newState = { ...prev };
              delete newState[itemKey];
              return newState;
            });
          }, 300);
        }
      }
    }, 500);
  };

  const handleInputBlur = (productId: string, variantId: string | null | undefined) => {
    const itemKey = `${productId}-${variantId || 'no-variant'}`;
    const inputValue = inputValues[itemKey];
    
    if (!inputValue || inputValue === '0') {
      // If input is empty or zero, reset to current quantity and clear input
      setInputValues(prev => {
        const newValues = { ...prev };
        delete newValues[itemKey];
        return newValues;
      });
    }
  };

  const handleRemoveItem = (productId: string, variantId: string | null | undefined) => {
    const itemKey = `${productId}-${variantId || 'no-variant'}`;
    setRemovingIds(prev => new Set(prev).add(itemKey));
    
    // Clear input value when removing
    setInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[itemKey];
      return newValues;
    });

    // Clear any pending debounce
    if (debounceRefs.current[itemKey]) {
      clearTimeout(debounceRefs.current[itemKey]);
      delete debounceRefs.current[itemKey];
    }
    
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
        const inputValue = inputValues[itemKey];
        const showError = showMaxQuantityError === itemKey;

        return (
          <div
            key={itemKey}
            className={`relative flex items-center justify-between rounded-lg bg-card/50 p-3 transition-all duration-300 ease-in-out border border-border ${
              isRemoving || isClearing ? "opacity-0 -translate-x-10" : "opacity-100 translate-x-0"
            }`}
          >
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
                   {displayCurrencyIconSafe}{item.displayPrice.toFixed(2)} each
                  {item.discountPercentage > 0 && (
                    <span className="line-through text-xs ml-1">
                       {displayCurrencyIconSafe}{item.originalPrice.toFixed(2)}
                    </span>
                  )}
                </p>

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

                  <div className="relative w-12 h-7 flex items-center justify-center">
                    <input
                      type="text"
                      value={inputValue !== undefined ? inputValue : item.quantity}
                      onChange={(e) => handleInputChange(item.productId, item.variantId, e.target.value)}
                      onBlur={() => handleInputBlur(item.productId, item.variantId)}
                      className="w-full h-full text-center border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      disabled={isClearing || item.isOutOfStock}
                      maxLength={3}
                    />
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

                {/* Show max quantity error */}
                {showError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xs text-destructive mt-1"
                  >
                    {/* Max quantity exceeded. Set to {item.stock}. */}
                    Max quantity exceeded. Set to max quantity in the stock.
                  </motion.p>
                )}
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
                 {displayCurrencyIconSafe}{(item.displayPrice * item.quantity).toFixed(2)}
              </motion.p>
            </div>
          </div>
        );
      })}
    </div>
  );
}