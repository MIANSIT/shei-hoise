"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import type { ProductSortOption } from "@/lib/queries/products/clientGetProducts";
import type { StorefrontBrand } from "@/lib/types/brand";
import ShopFilterDrawer from "./ShopFilterDrawer";
import ShopFilterPanel, {
  EMPTY_SHOP_FILTERS,
  countShopFilters,
  type FilterCategory,
  type ShopFilterValues,
} from "./ShopFilterPanel";

interface Category extends FilterCategory {
  description?: string;
  parent_id?: string;
  is_active: boolean;
}

interface ShopFilterCommonProps {
  categories: Category[];
  /** Brands of the store (empty when its plan has none). */
  brands?: StorefrontBrand[];
  values: ShopFilterValues;
  onFiltersChange: (values: ShopFilterValues) => void;
}

interface ProductFilterSectionProps extends ShopFilterCommonProps {
  totalProducts?: number;
  sortOption?: ProductSortOption;
  onSortChange?: (sort: ProductSortOption) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const t = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 py-1.5 pl-3 pr-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${t.filter.clearAll}: ${label}`}
        className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-gray-300 dark:hover:bg-gray-600"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/**
 * Desktop filter column (lg and up): the same controls as the mobile drawer,
 * applied the moment they change. Sits beside the product grid rather than
 * over the page, so the header and results stay in view.
 */
export function ShopFilterSidebar({
  categories,
  brands = [],
  values,
  onFiltersChange,
}: ShopFilterCommonProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const count = countShopFilters(values);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-50">
          <SlidersHorizontal className="h-4 w-4" />
          {t.filter.filter}
          {count > 0 && (
            <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white dark:bg-white dark:text-gray-900">
              {n(count)}
            </span>
          )}
        </h2>
        {count > 0 && (
          <button
            type="button"
            onClick={() => onFiltersChange(EMPTY_SHOP_FILTERS)}
            className="text-xs font-semibold text-gray-500 underline-offset-2 transition-colors hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-gray-100"
          >
            {t.filter.clearAll}
          </button>
        )}
      </div>
      <ShopFilterPanel
        categories={categories.filter((c) => c.is_active)}
        brands={brands}
        values={values}
        onChange={onFiltersChange}
      />
    </div>
  );
}

/**
 * Toolbar above the product grid: result count, sort, the applied-filter chips,
 * and (below lg) the Filter button that opens the drawer.
 */
export default function ProductFilterSection({
  categories,
  brands = [],
  values,
  onFiltersChange,
  totalProducts = 0,
  sortOption = "default",
  onSortChange,
  searchQuery = "",
  onSearchChange,
}: ProductFilterSectionProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const t = useTranslation();
  const n = useLocalNum();

  const activeCategories = categories.filter((c) => c.is_active);
  const activeFilterCount = countShopFilters(values);

  // A slug still loading (or from an old link) falls back to itself, so a chip is never blank.
  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
  const brandName = (slug: string) => brands.find((b) => b.slug === slug)?.name ?? slug;

  const sortOptions: { value: ProductSortOption; label: string }[] = [
    { value: "default", label: t.filter.sortShopOrder },
    { value: "newest", label: t.filter.sortNewest },
    { value: "price_asc", label: t.filter.sortPriceLow },
    { value: "price_desc", label: t.filter.sortPriceHigh },
    { value: "name_asc", label: t.filter.sortNameAZ },
  ];
  const activeSortLabel =
    sortOptions.find((o) => o.value === sortOption)?.label ??
    t.filter.sortShopOrder;

  const sortMenu = onSortChange ? (
    <DropdownMenu onOpenChange={setIsSortOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800">
          <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
          <span className="hidden text-xs font-medium text-gray-400 dark:text-gray-500 sm:inline">
            {t.filter.sort}
          </span>
          <span className="max-w-32 truncate sm:max-w-none">{activeSortLabel}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-gray-400 transition-transform duration-200 dark:text-gray-500",
              isSortOpen && "rotate-180",
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-xl border-gray-100 shadow-xl dark:border-gray-700 dark:bg-gray-900"
      >
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onSortChange(option.value)}
            className={cn(
              "mx-1 my-0.5 cursor-pointer rounded-lg px-3 py-2 text-sm",
              sortOption === option.value
                ? "bg-gray-900 font-semibold text-white focus:bg-gray-800 focus:text-white dark:bg-gray-100 dark:text-gray-900 dark:focus:bg-gray-200 dark:focus:text-gray-900"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
            )}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  const hasPrice = !!(values.minPrice || values.maxPrice);
  const priceLabel = `৳${n(Number(values.minPrice || 0))} – ${values.maxPrice ? `৳${n(Number(values.maxPrice))}` : "∞"}`;

  return (
    <section className="w-full">
      {/* ── Count (left) · Filter (below lg) + sort (right). Search lives in the header. ── */}
      <div className="flex items-center justify-between gap-3 pb-4">
        <span className="text-sm font-medium tabular-nums text-gray-500 dark:text-gray-400">
          {n(totalProducts)} {totalProducts === 1 ? t.filter.product : t.filter.products}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors lg:hidden",
              activeFilterCount > 0
                ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t.filter.filter}
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-gray-900 dark:bg-gray-900 dark:text-white">
                {n(activeFilterCount)}
              </span>
            )}
          </button>
          {sortMenu}
        </div>
      </div>

      {/* ── What is applied right now: one removable chip per filter ── */}
      {(activeFilterCount > 0 || !!searchQuery) && (
        <div className="flex flex-wrap items-center gap-2 pb-4">
          {values.categories.map((slug) => (
            <FilterChip
              key={`c-${slug}`}
              label={categoryName(slug)}
              onRemove={() =>
                onFiltersChange({ ...values, categories: values.categories.filter((s) => s !== slug) })
              }
            />
          ))}
          {values.brands.map((slug) => (
            <FilterChip
              key={`b-${slug}`}
              label={brandName(slug)}
              onRemove={() =>
                onFiltersChange({ ...values, brands: values.brands.filter((s) => s !== slug) })
              }
            />
          ))}
          {hasPrice && (
            <FilterChip
              label={priceLabel}
              onRemove={() => onFiltersChange({ ...values, minPrice: "", maxPrice: "" })}
            />
          )}
          {searchQuery && (
            <FilterChip label={`“${searchQuery}”`} onRemove={() => onSearchChange?.("")} />
          )}
          {activeFilterCount > 1 && (
            <button
              type="button"
              onClick={() => onFiltersChange(EMPTY_SHOP_FILTERS)}
              className="px-1 text-xs font-semibold text-gray-500 underline-offset-2 transition-colors hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-gray-100"
            >
              {t.filter.clearAll}
            </button>
          )}
        </div>
      )}

      <div className="h-px w-full bg-gray-100 dark:bg-gray-800" />

      <ShopFilterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        categories={activeCategories}
        brands={brands}
        values={values}
        onApply={onFiltersChange}
      />
    </section>
  );
}
