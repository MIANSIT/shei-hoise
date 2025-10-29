"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FC } from "react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  href: string;
  label?: string;
}

const BackButton: FC<BackButtonProps> = ({ href, label = "Back" }) => {
  return (
    <Button
      asChild
      variant="ghost" // Changed from "default" to "ghost" for a more subtle back button
      size="sm"
      className="mb-4 flex items-center gap-1 justify-start w-fit px-4 py-2 text-muted-foreground hover:text-foreground"
    >
      <Link href={href} className="flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> {/* Removed explicit color classes */}
        {label}
      </Link>
    </Button>
  );
};

export default BackButton;