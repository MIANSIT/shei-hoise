"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { CouponDiscountType } from "@/lib/types/enums";
import type { Coupon } from "@/lib/types/coupon";
import { useTranslation } from "@/lib/hook/useTranslation";

interface CouponStripProps {
  coupon: Coupon;
  storeSlug: string;
}

export function CouponStrip({ coupon, storeSlug }: CouponStripProps) {
  const [copied, setCopied] = useState(false);
  const t = useTranslation();

  const discountLabel =
    coupon.discount_type === CouponDiscountType.PERCENTAGE
      ? `${coupon.discount_value}% off`
      : `৳${coupon.discount_value} off`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-linear-to-r from-foreground via-foreground/90 to-foreground text-background">
      <div className="max-w-7xl mx-auto px-4 h-11 flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium">
        <span className="hidden sm:inline-flex bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0">
          Offer
        </span>
        <span className="truncate min-w-0">
          {coupon.title || discountLabel}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 bg-background/15 border border-dashed border-background/50 rounded px-2.5 py-1 font-mono font-bold tracking-wide shrink-0 hover:bg-background/25 transition-colors"
        >
          {coupon.code}
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
        <Link
          href={`/${storeSlug}/coupons`}
          className="text-background/75 hover:text-background underline underline-offset-2 shrink-0"
        >
          <span className="hidden sm:inline">{t.home.couponViewOffers}</span>
          <span className="sm:hidden">{t.home.viewAll}</span>
        </Link>
      </div>
    </div>
  );
}
