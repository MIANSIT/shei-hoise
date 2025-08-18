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
      className="mt-4 w-full sm:w-auto"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <SheiLoader /> : "Add to Cart"}
    </Button>
  );
};

export default AddToCartButton;
