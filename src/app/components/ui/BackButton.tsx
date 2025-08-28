// components/ui/BackButton.tsx
"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button"; 

interface BackButtonProps {
  label: string; // Dynamic part, e.g., "All Products"
  href: string;  // Redirect link
  variant?: "default" | "greenish" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const BackButton: React.FC<BackButtonProps> = ({
  label,
  href,
  variant = "default",
  size = "default",
}) => {
  return (
    <Link href={href} passHref>
      <Button asChild variant={variant} size={size} className="mb-4">
        <span className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to {label}
        </span>
      </Button>
    </Link>
  );
};

export default BackButton;
