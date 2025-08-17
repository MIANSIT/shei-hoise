"use client";

import { HiOutlineShoppingCart } from "react-icons/hi";
import { useCart } from "../../../lib/context/CartContext";

type ShoppingCartIconProps = {
  onClick?: () => void;
};

export default function ShoppingCartIcon({ onClick }: ShoppingCartIconProps) {
  const { cartCount } = useCart();

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 transition-colors cursor-pointer"
        aria-label="Shopping cart"
      >
        <HiOutlineShoppingCart size={18} className="text-white text-sm" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
            {cartCount}
          </span>
        )}
      </button>
    </div>
  );
}