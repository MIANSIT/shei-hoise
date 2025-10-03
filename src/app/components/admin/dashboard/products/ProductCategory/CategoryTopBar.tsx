"use client";

import { Button } from "@/components/ui/button";
import React from "react";

interface Props {
  showForm: boolean;
  toggleForm: () => void;
  isLgUp: boolean; // pass from page
}

export default function CategoryTopBar({
  showForm,
  toggleForm,
  isLgUp,
}: Props) {
  return (
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-semibold">Categories</h2>

      {/* Show button only on large screens or when form is not a modal */}
      {(isLgUp || !showForm) && (
        <Button
          variant="secondary"
          style={{
            backgroundColor: showForm ? "#dc2626" : "#16a34a", // red = close, green = create
            color: "white",
          }}
          onClick={toggleForm}
        >
          {showForm ? "Close Form" : "Create Category"}
        </Button>
      )}
    </div>
  );
}
