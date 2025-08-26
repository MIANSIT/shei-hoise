import { Button } from "@/components/ui/button";
import { ShoppingCart, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AddToCartButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  showSuccess?: boolean;
  className?: string;
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  onClick,
  isLoading = false,
  showSuccess = false,
  className = ""
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      size="lg"
      className={`gap-2 relative overflow-hidden cursor-pointer min-w-[140px] ${className} ${
        showSuccess
          ? "bg-green-600 hover:bg-green-700"
          : "bg-primary hover:bg-primary/90"
      }`}
    >
      <div className="flex items-center justify-center w-full relative h-6">
        {/* Default state */}
        <AnimatePresence mode="wait">
          {!isLoading && !showSuccess && (
            <motion.div
              key="default"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Add to Cart</span>
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
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
      </div>
    </Button>
  );
};

export default AddToCartButton;