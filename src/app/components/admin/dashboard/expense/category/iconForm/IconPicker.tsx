"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Search, X, ChevronDown, Sparkles } from "lucide-react";
import { ICON_NAMES, SUGGESTED_ICONS, IconByName } from "./IconbyName";
import { DEFAULT_COLOR } from "./ColorPicker";

// Grid constants — sized so 8 cols fit without horizontal overflow
const GRID_COLS = 8;
const ITEM_SIZE = 52;
const VISIBLE_ROWS = 4;

interface IconPickerProps {
  value?: string;
  onChange?: (val: string | undefined) => void;
  accentColor?: string;
}

export function IconPicker({
  value,
  onChange,
  accentColor = DEFAULT_COLOR,
}: IconPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [tab, setTab] = useState<"suggested" | "all">("suggested");

  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── icon list ──
  const sourceList = tab === "suggested" && !query ? SUGGESTED_ICONS : ICON_NAMES;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sourceList;
    return ICON_NAMES.filter((n) => n.toLowerCase().includes(q));
  }, [query, sourceList]);

  // ── virtual scroll ──
  const totalRows = Math.ceil(filtered.length / GRID_COLS);
  const visibleHeight = ITEM_SIZE * VISIBLE_ROWS;
  const totalHeight = totalRows * ITEM_SIZE;
  const startRow = Math.floor(scrollTop / ITEM_SIZE);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + visibleHeight) / ITEM_SIZE) + 1);
  const visibleIcons = filtered.slice(startRow * GRID_COLS, endRow * GRID_COLS);

  // ── close on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
      setScrollTop(0);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [open]);

  useEffect(() => {
    setScrollTop(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [query, tab]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleSelect = (name: string) => {
    onChange?.(name === value ? undefined : name);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          w-full flex items-center gap-3 px-3.5 rounded-xl border-2
          bg-white dark:bg-zinc-900 text-sm transition-all duration-200 cursor-pointer select-none
          ${open
            ? "border-indigo-500 dark:border-indigo-400 shadow-[0_0_0_4px_rgba(99,102,241,0.12)]"
            : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-500"
          }
        `}
        style={{ height: 44 }}
      >
        {value && ICON_NAMES.includes(value) ? (
          <>
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 shadow-sm"
              style={{ background: accentColor }}
            >
              <IconByName name={value} size={17} strokeWidth={2} className="text-white" />
            </span>
            <span className="flex-1 text-left font-semibold text-gray-700 dark:text-zinc-200 text-sm truncate">
              {value}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange?.(undefined); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange?.(undefined); } }}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors cursor-pointer shrink-0"
            >
              <X size={13} strokeWidth={2.5} />
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 shrink-0">
              <Sparkles size={15} className="text-gray-400 dark:text-zinc-500" strokeWidth={1.5} />
            </span>
            <span className="flex-1 text-left text-gray-400 dark:text-zinc-500">Choose an icon…</span>
            <ChevronDown
              size={15}
              strokeWidth={2}
              className={`text-gray-400 dark:text-zinc-500 transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute z-9999 mt-2 left-0 right-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] border border-gray-100 dark:border-zinc-700 overflow-hidden">

          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-all">
              <Search size={13} className="text-gray-400 dark:text-zinc-500 shrink-0" strokeWidth={2.5} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (e.target.value) setTab("all"); }}
                placeholder="Search icons…"
                className="flex-1 min-w-0 text-sm outline-none bg-transparent text-gray-700 dark:text-zinc-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")}
                  className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-500 dark:text-zinc-400 transition-colors shrink-0"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          {!query && (
            <div className="flex gap-1 px-3 pb-2">
              {(["suggested", "all"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer
                    ${tab === t
                      ? "text-white shadow-sm"
                      : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-200"
                    }`}
                  style={tab === t ? { background: accentColor } : undefined}
                >
                  {t === "suggested" ? "✦ Quick pick" : `All (${ICON_NAMES.length})`}
                </button>
              ))}
            </div>
          )}

          {/* Virtual scroll grid — overflow-x hidden prevents horizontal scroll */}
          {filtered.length === 0 ? (
            <div className="py-10 text-center px-4">
              <p className="text-sm text-gray-400 dark:text-zinc-500">
                No icons match <span className="font-medium text-gray-600 dark:text-zinc-300">&quot;{query}&quot;</span>
              </p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              style={{
                height: visibleHeight + 8,
                overflowY: "auto",
                overflowX: "hidden", // ✅ prevent horizontal scroll
                position: "relative",
              }}
            >
              <div style={{ height: totalHeight + 8, position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    top: startRow * ITEM_SIZE,
                    left: 8,
                    right: 8, // ✅ use left/right instead of width:100% to avoid overflow
                    display: "grid",
                    gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                    gap: 2,
                  }}
                >
                  {visibleIcons.map((name) => {
                    const isSelected = value === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() => handleSelect(name)}
                        className={`
                          flex flex-col items-center justify-center gap-1 rounded-xl
                          transition-all duration-100 cursor-pointer select-none min-w-0
                          ${isSelected ? "shadow-md scale-95" : "hover:scale-105"}
                        `}
                        style={{
                          height: ITEM_SIZE - 4,
                          padding: "6px 2px",
                          background: isSelected ? accentColor : undefined,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            (e.currentTarget as HTMLElement).style.background = `${accentColor}22`;
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected)
                            (e.currentTarget as HTMLElement).style.background = "";
                        }}
                      >
                        <span style={{ color: isSelected ? "white" : accentColor }}>
                          <IconByName name={name} size={18} strokeWidth={isSelected ? 2 : 1.75} />
                        </span>
                        <span
                          className="leading-none w-full text-center overflow-hidden"
                          style={{
                            fontSize: 7,
                            color: isSelected ? "rgba(255,255,255,0.85)" : "#9ca3af",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-zinc-700/60 bg-gray-50/80 dark:bg-zinc-800/60">
            <span className="text-[11px] text-gray-400 dark:text-zinc-500">
              {query
                ? `${filtered.length} results`
                : tab === "suggested"
                  ? "Popular icons"
                  : `${filtered.length} icons`}
            </span>
            {value && (
              <span className="text-[11px] font-semibold" style={{ color: accentColor }}>
                ✓ {value}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}