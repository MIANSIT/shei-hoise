"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import type { StorefrontBrand } from "@/lib/types/brand";

export interface FilterCategory {
  id: string;
  name: string;
  slug: string;
}

/** What the shopper has picked: slugs for categories/brands, whole-taka strings for the price range ("" = open). */
export interface ShopFilterValues {
  categories: string[];
  brands: string[];
  minPrice: string;
  maxPrice: string;
  /** "in" / "out"; having both (or neither) means no stock filter. */
  stock: StockChoice[];
}

export type StockChoice = "in" | "out";

export const EMPTY_SHOP_FILTERS: ShopFilterValues = {
  categories: [],
  brands: [],
  minPrice: "",
  maxPrice: "",
  stock: [],
};

/** Number of filters in effect (a price range counts once). */
export function countShopFilters(v: ShopFilterValues): number {
  return v.categories.length + v.brands.length + (v.minPrice || v.maxPrice ? 1 : 0) + v.stock.length;
}

interface ShopFilterPanelProps {
  categories: FilterCategory[];
  brands: StorefrontBrand[];
  values: ShopFilterValues;
  onChange: (values: ShopFilterValues) => void;
}

/** Lists longer than this collapse behind "Show more". */
const COLLAPSED_COUNT = 7;
/** Brand lists longer than this get a search box. */
const BRAND_SEARCH_THRESHOLD = 8;

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Digits only, so the price boxes can't hold "abc" or "-5". */
const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 9);

function Checkmark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors",
        checked
          ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
          : "border-gray-300 bg-white group-hover:border-gray-500 dark:border-gray-600 dark:bg-gray-900",
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3.5} />}
    </span>
  );
}

function OptionRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg py-2 text-left text-sm transition-colors",
        checked
          ? "font-semibold text-gray-900 dark:text-gray-50"
          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
      )}
    >
      <Checkmark checked={checked} />
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-gray-100 py-5 first:pt-0 last:border-b-0 dark:border-gray-800">
      <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-gray-50">{title}</h3>
      {children}
    </section>
  );
}

function ShowMoreButton({
  expanded,
  hiddenCount,
  onClick,
}: {
  expanded: boolean;
  hiddenCount: number;
  onClick: () => void;
}) {
  const t = useTranslation();
  const n = useLocalNum();
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 flex items-center gap-1 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
    >
      {expanded ? t.filter.showLess : `${t.filter.showMore} (${n(hiddenCount)})`}
      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
    </button>
  );
}

function PriceInput({
  value,
  placeholder,
  label,
  onCommit,
}: {
  value: string;
  placeholder: string;
  label: string;
  onCommit: (value: string) => void;
}) {
  // Typed freely, applied on blur / Enter so the list doesn't reload per keystroke.
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <label className="relative block flex-1">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">৳</span>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(digitsOnly(e.target.value))}
        onBlur={() => text !== value && onCommit(text)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit(text);
        }}
        className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-7 pr-2 text-sm tabular-nums text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-300"
      />
    </label>
  );
}

/**
 * The filter controls themselves — categories, brands (when the plan has them)
 * and a price range. Stateless about *when* a change takes effect: the sidebar
 * applies each change at once, the mobile drawer holds them as a draft.
 */
export default function ShopFilterPanel({ categories, brands, values, onChange }: ShopFilterPanelProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");

  const visibleCategories = showAllCategories ? categories : categories.slice(0, COLLAPSED_COUNT);

  const matchingBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    return q ? brands.filter((b) => b.name.toLowerCase().includes(q)) : brands;
  }, [brands, brandSearch]);
  const expandBrands = showAllBrands || !!brandSearch.trim();
  const visibleBrands = expandBrands ? matchingBrands : matchingBrands.slice(0, COLLAPSED_COUNT);

  return (
    <div>
      {categories.length > 0 && (
        <Section title={t.filter.categories}>
          <div>
            {visibleCategories.map((category) => (
              <OptionRow
                key={category.id}
                checked={values.categories.includes(category.slug)}
                onToggle={() =>
                  onChange({ ...values, categories: toggle(values.categories, category.slug) })
                }
              >
                <span className="min-w-0 flex-1 truncate">{category.name}</span>
              </OptionRow>
            ))}
          </div>
          {categories.length > COLLAPSED_COUNT && (
            <ShowMoreButton
              expanded={showAllCategories}
              hiddenCount={categories.length - COLLAPSED_COUNT}
              onClick={() => setShowAllCategories((v) => !v)}
            />
          )}
        </Section>
      )}

      {brands.length > 0 && (
        <Section title={t.filter.brands}>
          {brands.length > BRAND_SEARCH_THRESHOLD && (
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder={t.filter.searchBrands}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-300"
              />
            </div>
          )}
          {matchingBrands.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">{t.filter.noBrandMatch}</p>
          ) : (
            <div>
              {visibleBrands.map((brand) => (
                <OptionRow
                  key={brand.id}
                  checked={values.brands.includes(brand.slug)}
                  onToggle={() => onChange({ ...values, brands: toggle(values.brands, brand.slug) })}
                >
                  {brand.logo_url ? (
                    <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-gray-100 bg-white dark:border-gray-700">
                      <Image src={brand.logo_url} alt="" fill className="object-contain p-0.5" sizes="24px" />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{brand.name}</span>
                </OptionRow>
              ))}
            </div>
          )}
          {!brandSearch.trim() && matchingBrands.length > COLLAPSED_COUNT && (
            <ShowMoreButton
              expanded={showAllBrands}
              hiddenCount={matchingBrands.length - COLLAPSED_COUNT}
              onClick={() => setShowAllBrands((v) => !v)}
            />
          )}
        </Section>
      )}

      <Section title={t.filter.availability}>
        {(["in", "out"] as const).map((choice) => (
          <OptionRow
            key={choice}
            checked={values.stock.includes(choice)}
            onToggle={() => onChange({ ...values, stock: toggle(values.stock, choice) as StockChoice[] })}
          >
            <span className="min-w-0 flex-1 truncate">
              {choice === "in" ? t.filter.inStock : t.filter.outOfStock}
            </span>
          </OptionRow>
        ))}
      </Section>

      <Section title={t.filter.price}>
        <div className="flex items-center gap-2">
          <PriceInput
            value={values.minPrice}
            placeholder={t.filter.min}
            label={t.filter.min}
            onCommit={(minPrice) => onChange({ ...values, minPrice })}
          />
          <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">
            –
          </span>
          <PriceInput
            value={values.maxPrice}
            placeholder={t.filter.max}
            label={t.filter.max}
            onCommit={(maxPrice) => onChange({ ...values, maxPrice })}
          />
        </div>
        {(values.minPrice || values.maxPrice) && (
          <p className="mt-2 text-xs text-gray-400">
            ৳{n(Number(values.minPrice || 0))} – {values.maxPrice ? `৳${n(Number(values.maxPrice))}` : "∞"}
          </p>
        )}
      </Section>
    </div>
  );
}
