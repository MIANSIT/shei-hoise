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
    <div className="space-y-4">
      {cart.map((item: CartItem) => (
        <div
          key={item.id}
          className="flex items-start justify-between border-b border-gray-700 pb-4"
        >
          {/* Product Image and Info */}
          <div className="flex items-center gap-4 flex-1">
            <Image
              src={item.imageUrl}
              alt={item.title}
              width={64}
              height={64}
              className="object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-gray-400">{item.category}</p>
              <p className="text-sm text-gray-300 mt-1">
                ${item.currentPrice.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={() => handleQuantityChange(item, item.quantity - 1)}
                disabled={item.quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 text-center">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={() => handleQuantityChange(item, item.quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 h-8 px-2 cursor-pointer"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
            <p className="text-sm font-medium">
              ${(item.currentPrice * item.quantity).toFixed(2)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
