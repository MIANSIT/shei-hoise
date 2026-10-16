"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import type { StorefrontBrand } from "@/lib/types/brand";
import ShopFilterPanel, {
  EMPTY_SHOP_FILTERS,
  countShopFilters,
  type FilterCategory,
  type ShopFilterValues,
} from "./ShopFilterPanel";

interface ShopFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: FilterCategory[];
  brands: StorefrontBrand[];
  values: ShopFilterValues;
  onApply: (values: ShopFilterValues) => void;
}

/**
 * Mobile bottom sheet with the shop's filters. Changes are held in a draft and
 * only applied when the shopper taps the apply button, so the product list
 * doesn't reload on every tick. On desktop the same controls live in the
 * sidebar instead (see ShopFilterSidebar).
 */
export default function ShopFilterDrawer({
  open,
  onOpenChange,
  categories,
  brands,
  values,
  onApply,
}: ShopFilterDrawerProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const [draft, setDraft] = useState<ShopFilterValues>(values);

  // Start every opening from what is currently applied.
  useEffect(() => {
    if (open) setDraft(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const draftCount = countShopFilters(draft);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1200] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 lg:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-[1200] flex max-h-[88dvh] flex-col rounded-t-3xl bg-white shadow-2xl outline-none duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom dark:bg-gray-950 lg:hidden"
        >
          <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 pt-2">
            <DialogPrimitive.Title className="text-lg font-bold text-gray-900 dark:text-gray-50">
              {t.filter.filter}
              {draftCount > 0 && (
                <span className="ml-2 rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white dark:bg-white dark:text-gray-900">
                  {n(draftCount)}
                </span>
              )}
            </DialogPrimitive.Title>
            <div className="flex items-center gap-1">
              {draftCount > 0 && (
                <button
                  type="button"
                  onClick={() => setDraft(EMPTY_SHOP_FILTERS)}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  {t.filter.clearAll}
                </button>
              )}
              <DialogPrimitive.Close
                aria-label={t.filter.close}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto border-t border-gray-100 px-5 py-5 dark:border-gray-800">
            <ShopFilterPanel categories={categories} brands={brands} values={draft} onChange={setDraft} />
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-950">
            <button
              type="button"
              onClick={() => {
                onApply(draft);
                onOpenChange(false);
              }}
              className="h-12 w-full rounded-xl bg-gray-900 text-sm font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-gray-900"
            >
              {draftCount > 0 ? t.filter.applyWithCount.replace("{n}", n(draftCount)) : t.filter.showAll}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
