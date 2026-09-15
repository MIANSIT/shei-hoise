"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { CouponDiscountType } from "@/lib/types/enums";
import type { Coupon } from "@/lib/types/coupon";
import { useTranslation } from "@/lib/hook/useTranslation";

interface CouponStripProps {
  /** Live, `show_on_storefront` coupons, featured-first — see getStorefrontCoupons. */
  coupons: Coupon[];
  storeSlug: string;
}

const ROTATE_MS = 5000;

/**
 * A single coupon has an actionable copy-code button, unlike the plain-text
 * announcement bar — so multiple coupons take turns one at a time (cross-fade
 * carousel) rather than scrolling as a ticker, which would drag a clickable
 * button past the cursor. Reduced-motion viewers get the first (featured, or
 * best-discount) coupon only, statically — the rest stay reachable via
 * "view all offers" rather than auto-advancing content they can't animate.
 */
export function CouponStrip({ coupons, storeSlug }: CouponStripProps) {
  const [copied, setCopied] = useState(false);
  const [index, setIndex] = useState(0);
  const t = useTranslation();
  const reduceMotion = useReducedMotion();

  const rotating = coupons.length > 1 && !reduceMotion;

  useEffect(() => {
    if (!rotating) return;
    setIndex(0);
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % coupons.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [rotating, coupons.length]);

  const coupon = coupons[rotating ? index : 0];
  if (!coupon) return null;

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
      <div className="max-w-7xl mx-auto px-4 h-11 flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium overflow-hidden">
        <span className="hidden sm:inline-flex bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0">
          Offer
        </span>

        {rotating ? (
          <AnimatePresence mode="wait">
            <m.div
              key={coupon.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex items-center gap-2 sm:gap-3 min-w-0"
            >
              <span className="truncate min-w-0">{coupon.title || discountLabel}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 bg-background/15 border border-dashed border-background/50 rounded px-2.5 py-1 font-mono font-bold tracking-wide shrink-0 hover:bg-background/25 transition-colors"
              >
                {coupon.code}
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </m.div>
          </AnimatePresence>
        ) : (
          <>
            <span className="truncate min-w-0">{coupon.title || discountLabel}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-background/15 border border-dashed border-background/50 rounded px-2.5 py-1 font-mono font-bold tracking-wide shrink-0 hover:bg-background/25 transition-colors"
            >
              {coupon.code}
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </>
        )}

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
