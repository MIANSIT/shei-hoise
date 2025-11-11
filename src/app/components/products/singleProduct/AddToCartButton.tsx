// components/products/singleProduct/AddToCartButton.tsx
import { Button } from "@/components/ui/button";
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
  label = "Add to Cart"
}) => {
  const handleClick = () => {
    if (disabled || isLoading || isMaxInCart) return;
    onClick();
  };

  // Determine button state and styling
  const getButtonState = () => {
    if (showSuccess) {
      return {
        bg: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-primary-foreground",
        disabled: true
      };
    }
    if (isMaxInCart) {
      return {
        bg: "bg-blue-500 hover:bg-blue-600 text-white",
        disabled: true
      };
    }
    if (disabled) {
      return {
        bg: "bg-gray-400 text-gray-200",
        disabled: true
      };
    }
    return {
      bg: "bg-primary hover:bg-primary/90 text-primary-foreground",
      disabled: false
    };
  };

  const buttonState = getButtonState();

  return (
    <Button
      onClick={handleClick}
      disabled={buttonState.disabled || isLoading}
      size="lg"
      className={`gap-2 relative overflow-hidden cursor-pointer min-w-[140px] ${className} ${buttonState.bg} ${
        (isLoading || buttonState.disabled) ? "cursor-not-allowed" : ""
      }`}
    >
      <div className="flex items-center justify-center w-full relative h-6">
        {/* Default state */}
        <AnimatePresence mode="wait">
          {!isLoading && !showSuccess && !isMaxInCart && !disabled && (
            <motion.div
              key="default"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{label}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        <AnimatePresence mode="wait">
          {isLoading && !showSuccess && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute flex items-center gap-2"
            >
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
              <span>Adding...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success state */}
        <AnimatePresence mode="wait">
          {showSuccess && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>Added!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Max in Cart state */}
        <AnimatePresence mode="wait">
          {isMaxInCart && (
            <motion.div
              key="max-in-cart"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute flex items-center gap-2"
            >
              <Info className="w-5 h-5" />
              <span>Max in Cart ({currentCartQuantity})</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Out of Stock state */}
        <AnimatePresence mode="wait">
          {disabled && !isMaxInCart && !isLoading && !showSuccess && (
            <motion.div
              key="out-of-stock"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Out of Stock</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Button>
  );
};

export default AddToCartButton;