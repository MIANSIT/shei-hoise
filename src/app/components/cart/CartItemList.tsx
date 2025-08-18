// components/cart/CartItemsList.tsx
"use client";

import { CartItem } from "@/lib/types/cart";
import useCartStore from "@/lib/store/cartStore";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function CartItemsList() {
  const { cart, removeItem, updateQuantity, clearCart } = useCartStore();
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(item.id, newQuantity);
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
    }, 300); // Match this with animation duration
  };

  return (
    <div className="space-y-3">
      {/* Clear Cart Button (only shown when cart has items) */}
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

      {/* Cart Items with Animations */}
      {cart.map((item: CartItem) => (
        <div
          key={item.id}
          className={`
            relative flex items-center justify-between rounded-lg bg-black/20 p-3
            transition-all duration-300 ease-in-out
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
                src={item.imageUrl}
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
                <span className="w-6 text-center">{item.quantity}</span>
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
            <p className="text-white font-medium">
              ${(item.currentPrice * item.quantity).toFixed(2)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
