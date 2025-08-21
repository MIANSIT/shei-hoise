// components/cart/CartItemsList.tsx
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
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [changingQuantities, setChangingQuantities] = useState<
    Record<number, "up" | "down">
  >({});

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

  const handleRemoveItem = (id: number) => {
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
      {/* Clear Cart Button */}
      {cart.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            className="text-red-500 hover:text-red-600 text-sm cursor-pointer"
            onClick={handleClearCart}
            disabled={isClearing}
          >
            Clear Cart
          </Button>
        </div>
      )}

      {/* Cart Items */}
      {cart.map((item: CartItem) => (
        <div
          key={item.id}
          className={`
            relative flex items-center justify-between rounded-lg bg-black/20 p-3
            transition-all duration-300 ease-in-out border-gray-700 border-2
            ${
              removingId === item.id || isClearing
                ? "opacity-0 -translate-x-10"
                : "opacity-100 translate-x-0"
            }
          `}
        >
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-lg overflow-hidden">
              <Image
                src={item.images[0]}
                alt={item.title}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-medium text-white md:text-xs text-sm">
                {item.title}
              </h3>
              <p className="text-sm text-gray-400">{item.category}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-md cursor-pointer hover:bg-white/10"
                  onClick={() => handleQuantityChange(item, item.quantity - 1)}
                  disabled={item.quantity <= 1 || isClearing}
                >
                  <Minus className="h-3 w-3" />
                </Button>

                <div className="relative w-6 h-6 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={item.quantity}
                      initial={{
                        y: changingQuantities[item.id] === "up" ? -20 : 20,
                        opacity: 0,
                      }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{
                        y: changingQuantities[item.id] === "up" ? 20 : -20,
                        opacity: 0,
                      }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="absolute text-center"
                    >
                      {item.quantity}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-md cursor-pointer hover:bg-white/10"
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
              className="group h-8 w-8 cursor-pointer hover:bg-red-500/10 transition-colors"
              onClick={() => handleRemoveItem(item.id)}
              aria-label="Remove item"
              disabled={isClearing}
            >
              <Trash2 className="h-4 w-4 text-red-500 group-hover:text-red-400 transition-colors" />
            </Button>
            <motion.p
              className="text-white font-medium"
              key={`price-${item.id}-${item.quantity}`}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              ${(item.currentPrice * item.quantity).toFixed(2)}
            </motion.p>
          </div>
        </div>
      ))}
    </div>
  );
}
