"use client";

import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface AnnouncementBarProps {
  /** Free-text set by the store owner on the Storefront Design page — wins over the auto free-shipping line when set. */
  manualText: string | null;
  /** Store settings' free-shipping threshold — used to auto-compose a line when no manual text is set. */
  freeShippingThreshold: number | null;
}

/**
 * Utility bar shown above the storefront navbar. Renders the owner's manual
 * announcement text if set; otherwise, if the store has a free-shipping
 * threshold configured, auto-composes "Free shipping on orders over ৳X" from
 * it — that number can never drift from the real setting since it isn't
 * hand-typed anywhere. Renders nothing when neither is set (see the
 * `showAnnouncement` gate in [store_slug]/layout.tsx, which decides this
 * server-side so the header's offset is correct on first paint).
 *
 * The store header is `fixed top-0` (see DesktopHeaderforStore/
 * MobileHeaderforStore, each of which reserves its own space with a matching
 * spacer div right after the fixed element) — a normal-flow bar placed
 * before it would just be painted over, not pushed down. This follows the
 * same self-contained "fixed element + its own spacer" pattern instead, and
 * StoreHeader shifts its own fixed `top` offset down by this bar's height
 * (h-9) via the `hasAnnouncement` prop so the two stack correctly instead of
 * overlapping.
 */
export function AnnouncementBar({ manualText, freeShippingThreshold }: AnnouncementBarProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const { icon: currencyIcon, loading: currencyLoading } = useUserCurrencyIcon();
  const currency = currencyLoading ? "৳" : currencyIcon || "৳";

  const trimmedManual = manualText?.trim();
  const text = trimmedManual
    ? trimmedManual
    : freeShippingThreshold && freeShippingThreshold > 0
      ? `${t.product.freeDelivery} — ${t.product.ordersOver} ${currency}${n(freeShippingThreshold)}`
      : null;

  if (!text) return null;

  return (
    <>
      <div className="fixed top-0 left-0 w-full z-60 bg-header text-header-foreground text-xs sm:text-[13px] font-medium">
        <div className="max-w-7xl mx-auto px-4 h-9 flex items-center justify-center text-center">
          <span className="truncate">{text}</span>
        </div>
      </div>
      <div className="h-9" />
    </>
  );
}
