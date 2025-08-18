"use client";

import { FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { SheiLoader } from "../ui/SheiLoader";

interface AddToCartButtonProps {
  onAdd: () => Promise<void>;
}

const AddToCartButton: FC<AddToCartButtonProps> = ({ onAdd }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await onAdd();
    setLoading(false);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="
        mt-4 
        w-full sm:w-auto 
        h-12 px-6 
        text-base font-medium 
        rounded-xl 
        transition-colors 
        disabled:opacity-70
      "
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <SheiLoader />
          <span className="hidden sm:inline">Adding...</span>
        </div>
      ) : (
        "Add to Cart"
      )}
    </Button>
  );
};

export default AddToCartButton;
