"use client";

import { HiOutlineShoppingCart } from "react-icons/hi";
import useCartStore from "@/lib/store/cartStore";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";

type ShoppingCartIconProps = {
  onClick?: () => void;
};

export default function ShoppingCartIcon({ onClick }: ShoppingCartIconProps) {
  const { getCartByStore } = useCartStore();
  const params = useParams();
  const store_slug = params.store_slug as string;

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get store-specific cart items and count unique products
  const cartItems = isMounted ? getCartByStore(store_slug) : [];
  const uniqueProductCount = cartItems.length; // Each item is a unique product+variant combination

  // Adding to cart happens on a different part of the screen from the cart
  // icon, so without a signal here nothing visibly moves and customers re-tap
  // "Add to cart" — which is why this pulses on increase only. A bump on
  // *removal* would read as confirmation of the wrong thing.
  const [justAdded, setJustAdded] = useState(false);
  const previousCount = useRef(uniqueProductCount);

  useEffect(() => {
    if (uniqueProductCount > previousCount.current) {
      setJustAdded(true);
      const timer = setTimeout(() => setJustAdded(false), 600);
      previousCount.current = uniqueProductCount;
      return () => clearTimeout(timer);
    }
    previousCount.current = uniqueProductCount;
  }, [uniqueProductCount]);

  return (
    <div className='relative'>
      <m.button
        onClick={onClick}
        animate={justAdded ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
        className='flex items-center justify-center w-8 h-8 rounded-full bg-foreground hover:bg-foreground/90 transition-colors cursor-pointer'
        aria-label='Shopping cart'
      >
        <HiOutlineShoppingCart size={18} className='text-background text-sm' />
      </m.button>

      <AnimatePresence>
        {uniqueProductCount > 0 && (
          <m.span
            key='cart-count'
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className='pointer-events-none absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center'
          >
            {/* Keyed on the value so the number itself re-animates when it
                changes, not just when the badge first appears. */}
            <m.span
              key={uniqueProductCount}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {uniqueProductCount}
            </m.span>
          </m.span>
        )}
      </AnimatePresence>

      {/* Ring that expands out of the badge on add — the "something arrived
          here" cue. Purely decorative, so it is hidden from assistive tech and
          disabled outright under reduced motion via MotionConfig. */}
      <AnimatePresence>
        {justAdded && (
          <m.span
            aria-hidden='true'
            initial={{ scale: 0.6, opacity: 0.55 }}
            animate={{ scale: 2.1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className='pointer-events-none absolute inset-0 rounded-full border-2 border-red-500'
          />
        )}
      </AnimatePresence>
    </div>
  );
}
