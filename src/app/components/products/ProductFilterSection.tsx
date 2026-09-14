"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  is_active: boolean;
}

interface ProductFilterSectionProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  categories: Category[];
  totalProducts?: number;
  sortOption?: string;
  onSortChange?: (sort: string) => void;
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function ProductFilterSection({
  activeCategory,
  onCategoryChange,
  categories,
  totalProducts = 0,
  // sortOption = "newest",
  // onSortChange,
  // viewMode = "grid",
  // onViewModeChange,
  searchQuery = "",
  onSearchChange,
}: ProductFilterSectionProps) {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const t = useTranslation();
  const n = useLocalNum();

  const activeCategories = categories.filter((c) => c.is_active);
  const allCategories = [
    { id: "all", name: "All Products", displayName: t.shop.allProducts, slug: "all", is_active: true },
    ...activeCategories.map(c => ({ ...c, displayName: c.name })),
  ];

  const handleClearSearch = () => {
    onSearchChange?.("");
  };

  return (
    <section className="w-full mb-2">
      {/* ── Top bar: count only — search now lives in the header (global, reachable from every page) ── */}
      <div className="flex items-center justify-end gap-3 py-5">
        <span className="text-sm text-gray-400 dark:text-gray-500 font-medium tabular-nums">
          {n(totalProducts)}{" "}
          {totalProducts === 1 ? t.filter.product : t.filter.products}
        </span>
      </div>

      {/* ── Category Pills (Desktop) ── */}
      <div className="hidden md:flex items-center gap-2 flex-wrap pb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mr-1 flex items-center gap-1.5">
          <SlidersHorizontal className="w-3 h-3" />
          {t.filter.filter}
        </span>
        {allCategories.map((category) => {
          const isActive = activeCategory === category.name;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.name)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 border",
                isActive
                  ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100 shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-gray-100",
              )}
            >
              {category.displayName}
            </button>
          );
        })}
      </div>

      {/* ── Mobile: Category Dropdown ── */}
      <div className="flex md:hidden items-center justify-between pb-4">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {t.filter.category}
        </div>
        <DropdownMenu onOpenChange={setIsCategoryOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {activeCategory === "All Products" ? t.shop.allProducts : activeCategory}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-200",
                  isCategoryOpen && "rotate-180",
                )}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 rounded-xl shadow-xl border-gray-100 dark:border-gray-700 dark:bg-gray-900 max-h-64 overflow-y-auto"
          >
            {allCategories.map((category) => (
              <DropdownMenuItem
                key={category.id}
                onClick={() => onCategoryChange(category.name)}
                className={cn(
                  "cursor-pointer text-sm rounded-lg mx-1 my-0.5 px-3 py-2",
                  activeCategory === category.name
                    ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold focus:bg-gray-800 dark:focus:bg-gray-200 focus:text-white dark:focus:text-gray-900"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                )}
              >
                {category.displayName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Active filter chip ── */}
      {(searchQuery || activeCategory !== "All Products") && (
        <div className="flex flex-wrap gap-2 pb-3">
          {activeCategory !== "All Products" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
              {activeCategory}
              <button
                onClick={() => onCategoryChange("All Products")}
                className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
              &ldquo;{searchQuery}&rdquo;
              <button
                onClick={handleClearSearch}
                className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Divider ── */}
      <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />
    </section>
  );
}
