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
      variant="default" // your design background
      size="sm"
      className="mb-4 flex items-center gap-1 justify-start w-fit px-4 py-2" // w-fit makes width match content
    >
      <Link href={href} className="flex items-center gap-1">
        <ArrowLeft className="w-4 h-4 text-gray-900 dark:text-gray-100" />
        {label}
      </Link>
    </Button>
  );
};

export default BackButton;
