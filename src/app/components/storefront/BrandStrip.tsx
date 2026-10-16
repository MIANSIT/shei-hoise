"use client";

import Link from "next/link";
import Image from "next/image";
import type { StorefrontBrand } from "@/lib/types/brand";

interface BrandStripProps {
  brands: StorefrontBrand[];
  storeSlug: string;
}

/** First letter of the brand name, shown in place of a missing logo. */
function Monogram({ name, size }: { name: string; size: "sm" | "lg" }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-extrabold text-primary ${
        size === "lg" ? "h-14 w-14 text-2xl sm:h-16 sm:w-16 sm:text-3xl" : "h-5 w-5 text-[11px]"
      }`}
    >
      {initial}
    </span>
  );
}

/**
 * A single horizontally-scrollable row of brand logo tiles on the storefront
 * home page, each linking to the shop filtered by that brand. (The shop page
 * itself picks brands in its filter drawer.)
 */
export function BrandStrip({ brands, storeSlug }: BrandStripProps) {
  if (brands.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto scroll-smooth pb-2 sm:gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {brands.map((brand) => (
        <Link
          key={brand.id}
          href={`/${storeSlug}/shop?brand=${encodeURIComponent(brand.slug)}`}
          className="group flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-md sm:w-32"
        >
          <div className="relative flex h-14 w-full items-center justify-center sm:h-16">
            {brand.logo_url ? (
              <Image
                src={brand.logo_url}
                alt={brand.name}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-105"
                sizes="128px"
              />
            ) : (
              <Monogram name={brand.name} size="lg" />
            )}
          </div>
          <p className="line-clamp-1 w-full text-[12.5px] font-bold leading-snug tracking-tight text-foreground sm:text-[13px]">
            {brand.name}
          </p>
        </Link>
      ))}
    </div>
  );
}
