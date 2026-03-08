"use client";

import { ShoppingCart, Check, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AddToCartButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  showSuccess?: boolean;
  disabled?: boolean;
  isMaxInCart?: boolean;
  currentCartQuantity?: number;
  className?: string;
  label?: string;
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  onClick,
  isLoading = false,
  showSuccess = false,
  disabled = false,
  isMaxInCart = false,
  currentCartQuantity = 0,
  className = "",
  label = "Add to Cart",
}) => {
  const handleClick = () => {
    if (disabled || isLoading || isMaxInCart) return;
    onClick();
  };

  const buttonClass = [
    "w-full h-14 rounded-2xl flex items-center justify-center gap-2.5 text-[14px] font-bold tracking-wide transition-all duration-300",
    disabled && !isMaxInCart
      ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
      : isMaxInCart
        ? "bg-blue-500 text-white cursor-not-allowed"
        : showSuccess
          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50"
          : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-lg shadow-black/10 dark:shadow-black/30 hover:bg-gray-800 dark:hover:bg-white cursor-pointer",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || isLoading}
      whileTap={!disabled && !isMaxInCart ? { scale: 0.98 } : {}}
      className={buttonClass}
    >
      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.span
            key="success"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Added to Cart
          </motion.span>
        ) : isLoading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Adding…
          </motion.span>
        ) : isMaxInCart ? (
          <motion.span
            key="maxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Info className="w-4 h-4" />
            Max in Cart ({currentCartQuantity})
          </motion.span>
        ) : disabled ? (
          <motion.span
            key="oos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Out of Stock
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default AddToCartButton;
