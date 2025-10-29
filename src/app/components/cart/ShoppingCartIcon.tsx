"use client";

import { HiOutlineShoppingCart } from "react-icons/hi";
import useCartStore from "@/lib/store/cartStore";
import { useEffect, useState } from "react";

type ShoppingCartIconProps = {
  onClick?: () => void;
};

export default function ShoppingCartIcon({ onClick }: ShoppingCartIconProps) {
  const { totalItems } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const displayCount = isMounted ? totalItems() : 0;

  return (
    <div className='relative'>
      <button
        onClick={onClick}
        className='flex items-center justify-center w-8 h-8 rounded-full bg-foreground hover:bg-foreground/90 transition-colors cursor-pointer'
        aria-label='Shopping cart'
      >
        <HiOutlineShoppingCart size={18} className='text-background text-sm' />
        {displayCount > 0 && (
          <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center'>
            {displayCount}
          </span>
        )}
      </button>
    </div>
  );
}