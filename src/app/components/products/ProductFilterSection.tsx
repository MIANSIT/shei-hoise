"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, KeyboardEvent, useEffect } from "react";

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
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const activeCategories = categories.filter((c) => c.is_active);
  const allCategories = [
    { id: "all", name: "All Products", slug: "all", is_active: true },
    ...activeCategories,
  ];

  const handleSearchSubmit = () => {
    if (onSearchChange) onSearchChange(localSearch.trim());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearchSubmit();
  };

  const handleClearSearch = () => {
    setLocalSearch("");
    if (onSearchChange) onSearchChange("");
  };

  return (
    <section className="w-full mb-2">
      {/* ── Top bar: Search + Count ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-5">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products…"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="
                w-full pl-10 pr-10 py-2.5 text-sm
                bg-gray-50 dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-xl
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10
                focus:border-gray-400 dark:focus:border-gray-500
                transition-all duration-200
              "
            />
            {localSearch && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearchSubmit}
            className="
              h-10 px-4 rounded-xl
              bg-gray-900 dark:bg-gray-100
              text-white dark:text-gray-900
              text-sm font-semibold
              hover:bg-gray-700 dark:hover:bg-gray-300
              active:scale-[0.97] transition-all duration-200
              whitespace-nowrap shrink-0
            "
          >
            Search
          </button>
        </div>

        {/* Spacer + count */}
        <div className="flex items-center gap-3 sm:ml-auto">
          <span className="text-sm text-gray-400 dark:text-gray-500 font-medium tabular-nums">
            {totalProducts.toLocaleString()}{" "}
            {totalProducts === 1 ? "product" : "products"}
          </span>
        </div>
      </div>

      {/* ── Category Pills (Desktop) ── */}
      <div className="hidden md:flex items-center gap-2 flex-wrap pb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mr-1 flex items-center gap-1.5">
          <SlidersHorizontal className="w-3 h-3" />
          Filter
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
              {category.name}
            </button>
          );
        })}
      </div>

      {/* ── Mobile: Category Dropdown ── */}
      <div className="flex md:hidden items-center justify-between pb-4">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Category
        </div>
        <DropdownMenu onOpenChange={setIsCategoryOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {activeCategory}
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
                {category.name}
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
