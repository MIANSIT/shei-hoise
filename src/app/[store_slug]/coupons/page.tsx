"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Ticket } from "lucide-react";
import { getStoreIdBySlug } from "@/lib/queries/stores/getStoreIdBySlug";
import { getStorefrontCoupons } from "@/lib/queries/coupons/getStorefrontCoupons";
import { CouponDiscountType } from "@/lib/types/enums";
import type { Coupon } from "@/lib/types/coupon";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

export default function CouponsPage() {
  const params = useParams();
  const storeSlugParam = params?.store_slug;
  const storeSlug = Array.isArray(storeSlugParam) ? storeSlugParam[0] : storeSlugParam;

  const t = useTranslation();
  const n = useLocalNum();
  const { icon: currencyIcon, loading: currencyLoading } = useUserCurrencyIcon();
  const displayCurrencyIcon = currencyLoading ? "৳" : currencyIcon || "৳";

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!storeSlug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const storeId = await getStoreIdBySlug(storeSlug);
      if (!storeId || cancelled) {
        setLoading(false);
        return;
      }
      const data = await getStorefrontCoupons(storeId);
      if (!cancelled) {
        setCoupons(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeSlug]);

  const formatDiscount = (coupon: Coupon) =>
    coupon.discount_type === CouponDiscountType.PERCENTAGE
      ? `${n(coupon.discount_value)}%`
      : `${displayCurrencyIcon}${n(coupon.discount_value)}`;

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode((current) => (current === code ? null : current)), 1500);
  };

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="bg-foreground text-background py-12 sm:py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <Link
            href={`/${storeSlug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-background/70 hover:text-background mb-6 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.coupons.backToHome}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t.coupons.pageTitle}</h1>
          <p className="text-background/70 text-sm sm:text-base">{t.coupons.pageSubtitle}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16">
            <Ticket className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t.coupons.noCoupons}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="flex bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-24 shrink-0 bg-primary text-primary-foreground flex flex-col items-center justify-center text-center px-2">
                  <span className="text-xl font-extrabold leading-none">{formatDiscount(coupon)}</span>
                  <span className="text-[10px] uppercase tracking-wide opacity-85 mt-1">
                    {t.coupons.offSuffix}
                  </span>
                </div>

                <div className="flex-1 min-w-0 p-4 flex flex-col">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {coupon.title || coupon.code}
                  </p>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {coupon.min_order_amount ? (
                      <p>
                        {t.coupons.minOrderPrefix} {displayCurrencyIcon}
                        {n(coupon.min_order_amount)}
                      </p>
                    ) : null}
                    {coupon.ends_at ? (
                      <p>
                        {t.coupons.expiresPrefix}{" "}
                        {new Date(coupon.ends_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(coupon.code)}
                    className="mt-auto pt-3 flex items-center justify-center gap-1.5 border border-dashed border-border rounded-md px-3 py-1.5 font-mono font-bold text-xs tracking-wide hover:bg-accent transition-colors self-start"
                  >
                    {coupon.code}
                    {copiedCode === coupon.code ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
