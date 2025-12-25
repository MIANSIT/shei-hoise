"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Grid3X3, List, Search, X } from "lucide-react";
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
  sortOption = "newest",
  onSortChange,
  viewMode = "grid",
  onViewModeChange,
  searchQuery = "",
  onSearchChange,
}: ProductFilterSectionProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync local search with prop
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Filter only active categories and add "All" option
  const activeCategories = categories.filter((category) => category.is_active);
  const allCategories = [
    { id: "all", name: "All Products", slug: "all", is_active: true },
    ...activeCategories,
  ];

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "name", label: "Name: A to Z" },
    { value: "popular", label: "Most Popular" },
  ];

  const handleSearchSubmit = () => {
    const trimmedSearch = localSearch.trim();
    if (onSearchChange) {
      onSearchChange(trimmedSearch);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  const handleClearSearch = () => {
    setLocalSearch("");
    if (onSearchChange) {
      onSearchChange("");
    }
  };

  const handleSearchInputChange = (value: string) => {
    setLocalSearch(value);
    // Update search in real-time (optional)
    // if (onSearchChange) {
    //   onSearchChange(value.trim());
    // }
  };

  return (
    <section className="w-full">
      {/* Header Section */}
      <div className="px-6 py-4 border-b">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Side - Title and Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* Search Box - Desktop & Tablet */}
            <div className="hidden md:flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products by name or description"
                  value={localSearch}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-10 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {localSearch && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                onClick={handleSearchSubmit}
                size="sm"
                className="whitespace-nowrap"
              >
                Search
              </Button>
            </div>

            {/* Product Count - Desktop & Tablet */}
            <div className="hidden md:block space-y-1">
              <p className="text-sm text-muted-foreground">
                {totalProducts} {totalProducts === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          {/* Right Side - Desktop & Tablet Controls */}
          <div className="hidden md:flex items-center gap-6">
            {/* Desktop & Tablet Controls */}
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              {onViewModeChange && (
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewModeChange("grid")}
                    className={cn(
                      "h-8 w-8 p-0 rounded-md",
                      viewMode === "grid"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewModeChange("list")}
                    className={cn(
                      "h-8 w-8 p-0 rounded-md",
                      viewMode === "list"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Sort Dropdown */}
              {onSortChange && (
                <DropdownMenu onOpenChange={setIsSortOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                      <span>Sort</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isSortOpen ? "rotate-180" : ""
                        )}
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {sortOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => onSortChange(option.value)}
                        className={cn(
                          "cursor-pointer",
                          sortOption === option.value && "bg-accent font-medium"
                        )}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Category Filter - Desktop & Tablet (Buttons) */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                Categories:
              </span>
              <div className="flex flex-wrap gap-2 max-w-xl">
                {allCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      activeCategory === category.name ? "default" : "outline"
                    }
                    size="sm"
                    className={cn(
                      "rounded-lg px-3 py-1 text-sm transition-colors whitespace-nowrap",
                      activeCategory === category.name
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                    onClick={() => onCategoryChange(category.name)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col gap-4 mt-4">
          {/* Search Box - Mobile with submit button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={localSearch}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-10 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {localSearch && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={handleSearchSubmit}
              size="sm"
              className="whitespace-nowrap px-4"
            >
              Search
            </Button>
          </div>

          {/* Mobile Controls Row */}
          <div className="flex items-center justify-between w-full">
            {/* Product Count */}
            <p className="text-sm text-muted-foreground">
              {totalProducts} {totalProducts === 1 ? "item" : "items"}
            </p>

            {/* Category Dropdown - Mobile */}
            <DropdownMenu onOpenChange={setIsCategoryOpen}>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center gap-2 cursor-pointer bg-accent px-3 py-1 rounded-md border border-border/50 text-sm font-medium hover:bg-accent/80 transition-colors">
                    <span className="font-semibold">{activeCategory}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isCategoryOpen ? "rotate-180" : ""
                      )}
                    />
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56 max-h-64 overflow-y-auto">
                {allCategories.map((category) => (
                  <DropdownMenuItem
                    key={category.id}
                    onClick={() => onCategoryChange(category.name)}
                    className={cn(
                      "cursor-pointer",
                      activeCategory === category.name &&
                        "bg-accent font-medium"
                    )}
                  >
                    {category.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </section>
  );
}