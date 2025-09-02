"use client";

import { Button } from "@/components/ui/button";
import React from "react";

interface Props {
  showForm: boolean;
  toggleForm: () => void;
}

export default function CategoryTopBar({ showForm, toggleForm }: Props) {
  return (
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-semibold">Categories</h2>

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
    </div>
  );
}
