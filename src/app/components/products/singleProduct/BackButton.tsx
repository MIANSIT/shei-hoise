"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FC } from "react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  href: string;
  label?: string;
  className?: string;
}

const BackButton: FC<BackButtonProps> = ({ href, label = "Back" }) => {
  return (
    <Link href={href} className="block w-fit mb-4">
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-1 justify-start w-full px-4 py-2 text-muted-foreground hover:text-foreground"
        icon={<ArrowLeft className="w-4 h-4" />}
      >
        {label}
      </Button>
    </Link>
  );
};

export default BackButton;