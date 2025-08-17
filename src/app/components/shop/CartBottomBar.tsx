// components/cart/CartBottomBar.tsx
"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type CartBottomBarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CartBottomBar({ isOpen, onClose }: CartBottomBarProps) {
  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      
      {/* Bottom Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-black text-white shadow-lg z-50 transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Your Cart</h2>
            <button 
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-800"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="pb-4">
            <p>This is cart (Mobile)</p>
          </div>
        </div>
      </div>
    </>
  );
}