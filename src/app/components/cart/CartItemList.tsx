"use client";

import { CartItem } from "@/lib/types/cart";
import useCartStore from "@/lib/store/cartStore";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CartItemsList() {
  const { cart, removeItem, updateQuantity, clearCart } = useCartStore();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [changingQuantities, setChangingQuantities] = useState<Record<string, "up" | "down">>({});

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
    if (cart.length === 0) return;
    setIsClearing(true);
    setTimeout(() => {
      clearCart();
      setIsClearing(false);
    }, 300);
  };

  return (
    <div className="space-y-3">
      {cart.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive/80 text-sm"
            onClick={handleClearCart}
            disabled={isClearing}
          >
            Clear Cart
          </Button>
        </div>
      )}

      {cart.map((item: CartItem) => {
        const variant = item.variants?.[0]; // First variant if exists
        const hasVariants = item.variants && item.variants.length > 0;
        
        const displayPrice =
          variant?.discounted_price && variant.discounted_price > 0
            ? variant.discounted_price
            : variant?.base_price ?? item.discounted_price ?? item.base_price;

        const displayImage =
          variant?.primary_image?.image_url ||
          variant?.product_images?.[0]?.image_url ||
          item.primary_image?.image_url ||
          item.images?.[0] ||
          "/placeholder.png";

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
                
                {/* Show variant information only if variants exist */}
                {hasVariants && variant && (
                  <p className="text-sm text-muted-foreground">
                    {variant.variant_name} 
                    {variant.color && ` - ${variant.color}`}
                  </p>
                )}
                
                {/* Show category only if it exists */}
                {item.category?.name && (
                  <p className="text-sm text-muted-foreground">
                    {item.category.name}
                  </p>
                )}

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
                ${ (displayPrice * item.quantity).toFixed(2) }
              </motion.p>
            </div>
          </div>
        );
      })}
    </div>
  );
}