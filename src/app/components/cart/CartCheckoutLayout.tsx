// components/cart/CartCheckoutLayout.tsx
"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

type CartCheckoutLayoutProps = {
  subtotal: number;
  onCheckout: () => void;
  buttonText?: string;
};

export default function CartCheckoutLayout({
  subtotal,
  onCheckout,
  buttonText = "Proceed to Checkout",
}: CartCheckoutLayoutProps) {
  return (
    <motion.div 
      className="pt-4 border-t border-gray-700 m-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between mb-4">
        <span>SubTotal:</span>
        <motion.span 
          className="font-bold"
          key={`subtotal-${subtotal}`}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          ${subtotal.toFixed(2)}
        </motion.span>
      </div>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button 
          className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 cursor-pointer transition-colors duration-300"
          onClick={onCheckout}
        >
          {buttonText}
        </Button>
      </motion.div>
    </motion.div>
  );
}