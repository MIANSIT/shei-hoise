"use client";

import { Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BuyNowButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

const BuyNowButton: React.FC<BuyNowButtonProps> = ({
  onClick,
  isLoading = false,
  disabled = false,
  className = "",
}) => {
  const handleClick = () => {
    if (disabled || isLoading) return;
    onClick();
  };

  const buttonClass = [
    "w-full h-14 rounded-2xl flex items-center justify-center gap-2.5 text-[14px] font-bold tracking-wide transition-all duration-300",
    disabled
      ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
      : "bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/40 cursor-pointer",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || isLoading}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={buttonClass}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
            Processing…
          </motion.span>
        ) : disabled ? (
          <motion.span
            key="oos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
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
            <Zap className="w-4 h-4" />
            Buy Now
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default BuyNowButton;
