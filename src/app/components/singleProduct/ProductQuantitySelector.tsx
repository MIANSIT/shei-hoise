"use client";

import { FC, useState } from "react";
import { Button } from "@/components/ui/button";

const ProductQuantitySelector: FC = () => {
  const [qty, setQty] = useState(1);

  return (
    <div className="flex items-center gap-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        className="w-8 h-8 sm:w-10 sm:h-10"
        onClick={() => setQty(Math.max(1, qty - 1))}
      >
        -
      </Button>
      <span className="px-3 text-base sm:text-lg">{qty}</span>
      <Button
        variant="outline"
        size="sm"
        className="w-8 h-8 sm:w-10 sm:h-10"
        onClick={() => setQty(qty + 1)}
      >
        +
      </Button>
    </div>
  );
};

export default ProductQuantitySelector;
