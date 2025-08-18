// components/cart/CartItemsList.tsx
"use client";

import { CartItem } from "@/lib/types/cart";
import useCartStore from "@/lib/store/cartStore";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

export default function CartItemsList() {
  const { cart, removeItem, updateQuantity } = useCartStore();

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(item.id, newQuantity);
  };

  return (
    <div className="space-y-6">
      {cart.map((item: CartItem) => (
        <div
          key={item.id}
          className="relative flex items-center justify-between rounded-lg bg-black/20 p-3"
        >
          {/* Remove Button (top-right corner) */}
          

          {/* Product Image and Info */}
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
              <h3 className="font-medium text-white">{item.title}</h3>
              <p className="text-sm text-gray-400">{item.category}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-md cursor-pointer"
                  onClick={() => handleQuantityChange(item, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-md cursor-pointer"
                  onClick={() => handleQuantityChange(item, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-end flex-col gap-8">
            <Button
            variant="ghost"
            size="icon"
            className=" text-red-500 hover:text-red-600 h-6 w-6 cursor-pointer"
            onClick={() => removeItem(item.id)}
          >
           <Trash2 className="h-4 w-4" />
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
