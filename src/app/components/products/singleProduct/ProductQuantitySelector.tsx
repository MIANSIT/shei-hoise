import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ProductQuantitySelectorProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean; // Add disabled prop
}

const ProductQuantitySelector: React.FC<ProductQuantitySelectorProps> = ({
  quantity,
  onIncrement,
  onDecrement,
  disabled = false, // Default to false
}) => {
  const [changingDirection, setChangingDirection] = useState<"up" | "down" | null>(null);

  const handleIncrement = () => {
    if (disabled) return;
    setChangingDirection("up");
    setTimeout(() => setChangingDirection(null), 300);
    onIncrement();
  };

  const handleDecrement = () => {
    if (disabled) return;
    setChangingDirection("down");
    setTimeout(() => setChangingDirection(null), 300);
    onDecrement();
  };

  return (
    <div className={`flex items-center border border-border rounded-md overflow-hidden ${
      disabled ? "opacity-50 cursor-not-allowed" : ""
    }`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDecrement}
        disabled={quantity <= 1 || disabled}
        className="h-10 w-10 rounded-none hover:bg-accent transition-colors cursor-pointer"
      >
        <Minus className="h-4 w-4" />
      </Button>
      
      <div className="relative w-10 h-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={quantity}
            initial={{ 
              y: changingDirection === "up" ? -20 : changingDirection === "down" ? 20 : 0,
              opacity: 0 
            }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ 
              y: changingDirection === "up" ? 20 : changingDirection === "down" ? -20 : 0,
              opacity: 0 
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute font-medium text-sm text-foreground"
          >
            {quantity}
          </motion.span>
        </AnimatePresence>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleIncrement}
        disabled={disabled}
        className="h-10 w-10 rounded-none hover:bg-accent transition-colors cursor-pointer"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ProductQuantitySelector;