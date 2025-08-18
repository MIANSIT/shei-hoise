// components/cart/CartCheckoutLayout.tsx
"use client";

import { Button } from "@/components/ui/button";

type CartCheckoutLayoutProps = {
  subtotal: number;
  onCheckout: () => void;
};

export default function CartCheckoutLayout({
  subtotal,
  onCheckout,
}: CartCheckoutLayoutProps) {
  return (
    <div className="pt-4 border-t border-gray-700 m-4">
      <div className="flex justify-between mb-4">
        <span>SubTotal:</span>
        <span className="font-bold">${subtotal.toFixed(2)}</span>
      </div>
      <Button 
        className="w-full bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
        onClick={onCheckout}
      >
        Proceed to Checkout
      </Button>
    </div>
  );
}