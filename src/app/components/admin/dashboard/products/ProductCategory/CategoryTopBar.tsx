"use client";

import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AppstoreOutlined,
  PlusOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useState, useEffect, useRef } from "react";
import MobileFilter from "@/app/components/admin/common/MobileFilter";

interface Props {
  showForm: boolean;
  toggleForm: () => void;
  searchText: string;
  onSearchSubmit: (text: string) => void;
  statusFilter: boolean | null;
  onStatusFilter: (status: boolean | null) => void;
}

type FilterOption = "all" | "active" | "inactive";

const filterOptions: FilterOption[] = ["all", "active", "inactive"];

const filterConfig: Record<
  FilterOption,
  {
    label: string;
    icon: React.ReactNode;
    activeClass: string;
    inactiveClass: string;
  }
> = {
  all: {
    label: "All",
    icon: <AppstoreOutlined />,
    activeClass:
      "bg-indigo-500 text-white border-indigo-500 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40",
    inactiveClass:
      "bg-white dark:bg-[#16181f] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#2a2d3a] hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-500",
  },
  active: {
    label: "Active",
    icon: <CheckCircleOutlined />,
    activeClass:
      "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/40",
    inactiveClass:
      "bg-white dark:bg-[#16181f] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#2a2d3a] hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-500",
  },
  inactive: {
    label: "Inactive",
    icon: <CloseCircleOutlined />,
    activeClass:
      "bg-red-500 text-white border-red-500 shadow-sm shadow-red-200 dark:shadow-red-900/40",
    inactiveClass:
      "bg-white dark:bg-[#16181f] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#2a2d3a] hover:border-red-300 dark:hover:border-red-600 hover:text-red-500",
  },
};

export default function CategoryTopBar({
  showForm,
  toggleForm,
  searchText,
  onSearchSubmit,
  statusFilter,
  onStatusFilter,
}: Props) {
  const [localSearch, setLocalSearch] = useState(searchText);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalSearch(searchText);
  }, [searchText]);

  const handleInputChange = (value: string) => {
    setLocalSearch(value);
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSearchSubmit(value);
      setIsTyping(false);
    }, 500);
  };

  const handleClear = () => {
    setLocalSearch("");
    onSearchSubmit("");
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const applyFilter = (opt: FilterOption) => {
    if (opt === "all") onStatusFilter(null);
    else if (opt === "active") onStatusFilter(true);
    else onStatusFilter(false);
  };

  const getFilterLabel = (opt: string) =>
    filterConfig[opt as FilterOption]?.label ?? opt;

  const filterValue: FilterOption =
    statusFilter === true
      ? "active"
      : statusFilter === false
        ? "inactive"
        : "all";

  return (
    <div
      className="bg-white dark:bg-[#16181f] border border-gray-200 dark:border-[#2a2d3a]
                    rounded-2xl p-3 sm:p-4 transition-colors duration-200"
    >
      {/*
        Layout:
          xs–md  → stacked column: search full-width, then filters + button row
          lg+    → single row:    search | filters | button
      */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* ── Search ── */}
        <div className="relative w-full lg:max-w-xs xl:max-w-sm shrink-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10 text-sm">
            <SearchOutlined />
          </span>
          <input
            value={localSearch}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (typingTimeoutRef.current)
                  clearTimeout(typingTimeoutRef.current);
                onSearchSubmit(localSearch);
                setIsTyping(false);
              }
            }}
            placeholder="Search categories…"
            className="w-full pl-9 pr-9 py-2 sm:py-2.5 rounded-xl
                       border border-gray-200 dark:border-[#2a2d3a]
                       bg-gray-50 dark:bg-[#0f1117]
                       text-sm text-gray-800 dark:text-gray-100
                       placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
                       transition-all duration-200"
          />
          {localSearch ? (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                         hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <CloseOutlined style={{ fontSize: 11 }} />
            </button>
          ) : isTyping ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 select-none">
              …
            </span>
          ) : null}
        </div>

        {/* ── Filters + Button ── */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 lg:flex-1">
          {/* Segment control — md+ */}
          <div
            className="hidden md:flex items-center gap-1 bg-gray-50 dark:bg-[#0f1117]
                          rounded-xl p-1 border border-gray-200 dark:border-[#2a2d3a] shrink-0"
          >
            {filterOptions.map((opt) => {
              const cfg = filterConfig[opt];
              const isActive = filterValue === opt;
              return (
                <button
                  key={opt}
                  onClick={() => applyFilter(opt)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border
                              text-xs font-semibold transition-all duration-200 whitespace-nowrap
                              ${isActive ? cfg.activeClass : cfg.inactiveClass}`}
                >
                  {cfg.icon}
                  <span className="hidden sm:inline">{cfg.label}</span>
                </button>
              );
            })}
          </div>

          {/* MobileFilter — below md */}
          <div className="md:hidden shrink-0">
            <MobileFilter
              value={filterValue}
              defaultValue="all"
              options={[...filterOptions]}
              onChange={(val) => applyFilter(val as FilterOption)}
              getLabel={getFilterLabel}
            />
          </div>

          {/* Create / Close button */}
          <button
            onClick={toggleForm}
            className={`flex items-center justify-center gap-1.5 sm:gap-2
                        px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl
                        text-xs sm:text-sm font-semibold
                        transition-all duration-200 border
                        whitespace-nowrap shrink-0
                        ${
                          showForm
                            ? "bg-red-50 dark:bg-red-500/10 text-red-500 border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20"
                            : "bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white border-indigo-500 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30"
                        }`}
          >
            {showForm ? (
              <>
                <CloseOutlined />
                <span>Close</span>
              </>
            ) : (
              <>
                <PlusOutlined />
                <span className="hidden xs:inline sm:inline">New Category</span>
                <span className="xs:hidden sm:hidden">New</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
