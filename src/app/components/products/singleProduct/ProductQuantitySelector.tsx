import { Button } from "../../../../components/ui/button";
import { Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ProductQuantitySelectorProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onQuantityInput?: (quantity: number) => void;
  disabled?: boolean;
  maxQuantity?: number;
}

const ProductQuantitySelector: React.FC<ProductQuantitySelectorProps> = ({
  quantity,
  onIncrement,
  onDecrement,
  onQuantityInput,
  disabled = false,
  maxQuantity = 999,
}) => {
  const [changingDirection, setChangingDirection] = useState<"up" | "down" | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

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

  const handleInputClick = () => {
    if (disabled) return;
    setIsEditing(true);
    setInputValue(quantity.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(value);
  };

  const handleInputBlur = () => {
    if (!inputValue || inputValue === '0') {
      setInputValue("");
      setIsEditing(false);
      return;
    }

    let newQuantity = parseInt(inputValue, 10);
    
    if (isNaN(newQuantity) || newQuantity < 1) {
      newQuantity = 1;
    }
    
    if (newQuantity > maxQuantity) {
      newQuantity = maxQuantity;
    }

    if (onQuantityInput && newQuantity !== quantity) {
      onQuantityInput(newQuantity);
    }

    setInputValue("");
    setIsEditing(false);
  };

  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
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
      
      <div 
        className="relative w-10 h-10 flex items-center justify-center cursor-pointer"
        onClick={handleInputClick}
      >
        <AnimatePresence mode="wait">
          {isEditing ? (
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyPress={handleInputKeyPress}
              className="w-full h-full text-center border-none bg-transparent focus:outline-none text-sm font-medium"
              autoFocus
              maxLength={3}
            />
          ) : (
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
          )}
        </AnimatePresence>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleIncrement}
        disabled={disabled || quantity >= maxQuantity}
        className="h-10 w-10 rounded-none hover:bg-accent transition-colors cursor-pointer"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ProductQuantitySelector;