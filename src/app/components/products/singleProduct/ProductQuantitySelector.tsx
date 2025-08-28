import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ProductQuantitySelectorProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

const ProductQuantitySelector: React.FC<ProductQuantitySelectorProps> = ({
  quantity,
  onIncrement,
  onDecrement,
}) => {
  const [changingDirection, setChangingDirection] = useState<"up" | "down" | null>(null);

  const handleIncrement = () => {
    setChangingDirection("up");
    setTimeout(() => setChangingDirection(null), 300);
    onIncrement();
  };

  const handleDecrement = () => {
    setChangingDirection("down");
    setTimeout(() => setChangingDirection(null), 300);
    onDecrement();
  };

  return (
    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDecrement}
        disabled={quantity <= 1}
        className="h-10 w-10 rounded-none hover:bg-white/10 transition-colors cursor-pointer"
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
            className="absolute font-medium text-sm"
          >
            {quantity}
          </motion.span>
        </AnimatePresence>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleIncrement}
        className="h-10 w-10 rounded-none hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ProductQuantitySelector;