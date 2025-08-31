"use client";

import React from "react";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";

interface UpdateStockButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

const UpdateStockButton: React.FC<UpdateStockButtonProps> = ({
  disabled = false,
  onClick,
}) => {
  return (
    <div className="flex justify-end">
      <SheiButton onClick={onClick} disabled={disabled}>
        Update Stock
      </SheiButton>
    </div>
  );
};

export default UpdateStockButton;
