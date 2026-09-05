"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  iconClassName?: string;
}

/**
 * Fills its parent (parent must be `relative`) with either the product image
 * or a placeholder icon — never a broken-image icon. Falls back on both a
 * missing `src` and a load failure (e.g. a deleted/broken storage URL), since
 * `/placeholder.png` doesn't exist as a real asset in public/.
 */
export function ProductImage({
  src,
  alt,
  className = "object-cover",
  sizes,
  iconClassName = "h-10 w-10 text-stone-400 dark:text-gray-500",
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-stone-100 dark:bg-gray-800">
        <Package className={iconClassName} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}
