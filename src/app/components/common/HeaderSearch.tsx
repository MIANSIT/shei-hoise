"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { clientGetProducts } from "@/lib/queries/products/clientGetProducts";
import { getEffectivePrice } from "@/lib/utils/getEffectivePrice";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useTranslation } from "@/lib/hook/useTranslation";
import type { Product } from "@/lib/types/product";

interface HeaderSearchProps {
  storeSlug: string;
  className?: string;
  /** Lets a tight header (e.g. mobile's icon row) hide its other icons while the search input is expanded, instead of fighting it for space. */
  onExpandedChange?: (expanded: boolean) => void;
}

const RESULT_LIMIT = 6;
const DEBOUNCE_MS = 300;

/**
 * Global product search living in the header (desktop + mobile), so it's
 * reachable from every page — not just the shop page, whose own search
 * input this replaces. Live-searches as you type via the same
 * clientGetProducts() the shop page's search already uses, so results here
 * always match what "View all results" (→ /shop?search=...) actually shows.
 */
export function HeaderSearch({ storeSlug, className = "", onExpandedChange }: HeaderSearchProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const t = useTranslation();
  const n = useLocalNum();
  const { icon: currencyIcon, loading: currencyLoading } = useUserCurrencyIcon();
  const currency = currencyLoading ? "৳" : currencyIcon || "৳";

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { products } = await clientGetProducts(storeSlug, 1, RESULT_LIMIT, undefined, trimmed);
        setResults(products);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, storeSlug]);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery((q) => {
          if (!q.trim()) setExpanded(false);
          return q;
        });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goToShopSearch = (q: string) => {
    setOpen(false);
    router.push(`/${storeSlug}/shop?search=${encodeURIComponent(q)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      goToShopSearch(query.trim());
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const formatPrice = (product: Product) => {
    const variant = product.variants?.[0];
    const effective = variant
      ? getEffectivePrice({
          base_price: variant.base_price,
          discounted_price: variant.discounted_price,
          sale_starts_at: variant.sale_starts_at,
          sale_ends_at: variant.sale_ends_at,
        })
      : getEffectivePrice({
          base_price: product.base_price,
          discounted_price: product.discounted_price,
          sale_starts_at: product.sale_starts_at,
          sale_ends_at: product.sale_ends_at,
        });
    return `${currency}${n(effective.price)}`;
  };

  const getThumb = (product: Product) => product.primary_image?.image_url || product.images?.[0] || null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`flex items-center gap-2 rounded-full border border-border bg-background transition-all duration-200 ${
          expanded ? "w-36 min-[400px]:w-48 sm:w-64 px-3.5 h-9" : "w-9 h-9 justify-center"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          aria-label={t.filter.search}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>
        {expanded && (
          <>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={t.filter.searchPlaceholder}
              className="flex-1 min-w-0 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear"
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {open && expanded && query.trim() && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[85vw] bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-muted-foreground">{t.nav.searchNoResults}</p>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                {results.map((product) => {
                  const thumb = getThumb(product);
                  return (
                    <Link
                      key={product.id}
                      href={`/${storeSlug}/product/${product.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-accent transition-colors border-b border-border last:border-b-0"
                    >
                      <div className="w-11 h-11 rounded-lg overflow-hidden bg-muted shrink-0">
                        {thumb && (
                          // eslint-disable-next-line @next/next/no-img-element -- small dropdown thumbnail, not worth next/image's fixed-size ceremony here
                          <img src={thumb} alt={product.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(product)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => goToShopSearch(query.trim())}
                className="w-full px-4 py-3 text-sm font-semibold text-primary hover:bg-accent transition-colors text-center border-t border-border"
              >
                {t.nav.searchViewAllFor} &quot;{query.trim()}&quot;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
