"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Checkbox, Collapse, InputNumber, Modal, Segmented, Select, Spin } from "antd";
import type { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import type { MrpAdjustMode } from "@/lib/utils/mrpAdjust";

export const UNCATEGORISED_KEY = "__uncategorised__";

export type ExportStockFilter = "all" | "in" | "out";

export interface ProductExportOptions {
  /** "all" = the whole store, otherwise a branch id. */
  scope: string;
  stock: ExportStockFilter;
  /** How the numbers below are read: a percentage or a money amount. */
  mode: MrpAdjustMode;
  /** Change for every product without its own category rate; + raises, − lowers, 0 leaves MRP alone. */
  defaultChange: number;
  /** Category id (or UNCATEGORISED_KEY) → change, overriding the default. */
  categoryChanges: Record<string, number>;
  includeImages: boolean;
}

const sumAvailable = (rows?: { quantity_available?: number | null }[] | null): number =>
  (rows ?? []).reduce((total, row) => total + (row.quantity_available ?? 0), 0);

/**
 * Keeps only what matches the stock choice. A variant product keeps just the
 * variants that match, and drops out when none do.
 */
export function filterByStock(
  products: ProductWithVariants[],
  stock: ExportStockFilter,
): ProductWithVariants[] {
  if (stock === "all") return products;
  const matches = (available: number) => (stock === "in" ? available > 0 : available <= 0);

  return products.flatMap((product) => {
    const variants = product.product_variants ?? [];
    if (variants.length === 0) {
      return matches(sumAvailable(product.product_inventory)) ? [product] : [];
    }
    const kept = variants.filter((v) => matches(sumAvailable(v.product_inventory)));
    return kept.length > 0 ? [{ ...product, product_variants: kept }] : [];
  });
}

interface ExportProductsModalProps {
  open: boolean;
  exporting: boolean;
  currencySymbol: string;
  /** Branch choices; empty for stores without branches. */
  scopes: { value: string; label: string }[];
  /** Loads every product for the chosen branch scope. */
  loadProducts: (scope: string) => Promise<ProductWithVariants[]>;
  onClose: () => void;
  onExport: (options: ProductExportOptions, products: ProductWithVariants[]) => void;
}

export function ExportProductsModal({
  open,
  exporting,
  currencySymbol,
  scopes,
  loadProducts,
  onClose,
  onExport,
}: ExportProductsModalProps) {
  const [scope, setScope] = useState<string | null>(null);
  const [stock, setStock] = useState<ExportStockFilter>("all");
  const [mode, setMode] = useState<MrpAdjustMode>("percent");
  const [defaultChange, setDefaultChange] = useState<number>(0);
  const [categoryChanges, setCategoryChanges] = useState<Record<string, number>>({});
  const [includeImages, setIncludeImages] = useState(true);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeScope = scope ?? scopes[0]?.value ?? "all";
  const unit = mode === "percent" ? "%" : currencySymbol;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    loadProducts(activeScope)
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Couldn't load products.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, activeScope, loadProducts]);

  const matching = useMemo(() => filterByStock(products, stock), [products, stock]);

  const categories = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; count: number }>();
    for (const product of matching) {
      const id = product.category_id ?? UNCATEGORISED_KEY;
      const entry = byId.get(id) ?? { id, name: product.category?.name ?? "No category", count: 0 };
      entry.count++;
      byId.set(id, entry);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [matching]);

  const customCount = Object.keys(categoryChanges).length;
  const minValue = mode === "percent" ? -99.99 : -1_000_000;

  return (
    <Modal
      open={open}
      title={<span className="text-sm font-bold">Export products</span>}
      onOk={() => onExport({ scope: activeScope, stock, mode, defaultChange, categoryChanges, includeImages }, matching)}
      onCancel={onClose}
      okText={`Download CSV (${matching.length})`}
      okButtonProps={{ disabled: exporting || loading || matching.length === 0 }}
      confirmLoading={exporting}
      width={640}
      centered
    >
      <div className="flex flex-col gap-4 pt-2">
        {scopes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground">Branch</span>
            <Select value={activeScope} onChange={setScope} options={scopes} />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">Stock</span>
          <Segmented
            block
            value={stock}
            onChange={(v) => setStock(v as ExportStockFilter)}
            options={[
              { label: "Both", value: "all" },
              { label: "In stock", value: "in" },
              { label: "Out of stock", value: "out" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">Change MRP in the file</span>
          <Segmented
            block
            value={mode}
            onChange={(v) => setMode(v as MrpAdjustMode)}
            options={[
              { label: "By percentage (%)", value: "percent" },
              { label: `By amount (${currencySymbol})`, value: "amount" },
            ]}
          />
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-muted-foreground flex-1">
              All products (use − to lower)
            </span>
            <InputNumber
              min={minValue}
              value={defaultChange}
              onChange={(v) => setDefaultChange(v ?? 0)}
              addonAfter={unit}
              className="w-36"
            />
          </div>
        </div>

        <Spin spinning={loading}>
          {loadError ? (
            <p className="text-xs text-red-500 m-0">{loadError}</p>
          ) : (
            categories.length > 0 && (
              <Collapse
                size="small"
                defaultActiveKey={["categories"]}
                items={[
                  {
                    key: "categories",
                    label: (
                      <span className="text-[13px] font-medium">
                        Change by category
                        <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                          {categories.length} categor{categories.length === 1 ? "y" : "ies"}
                        </span>
                        {customCount > 0 && (
                          <span className="ml-2 text-[11px] font-semibold text-amber-600">{customCount} set</span>
                        )}
                      </span>
                    ),
                    children: (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-h-64 overflow-y-auto pr-1">
                        {categories.map((c) => (
                          <div key={c.id} className="flex items-center justify-between gap-3">
                            <span className="text-[12.5px] text-muted-foreground truncate">
                              {c.name}
                              <span className="ml-1.5 text-[11px]">({c.count})</span>
                            </span>
                            <InputNumber
                              size="small"
                              min={minValue}
                              // Empty = follow the "All products" change instead of showing a value nobody chose.
                              value={categoryChanges[c.id] ?? null}
                              placeholder={String(defaultChange)}
                              addonAfter={unit}
                              className="w-32 shrink-0"
                              onChange={(val) =>
                                setCategoryChanges((prev) => {
                                  const next = { ...prev };
                                  if (val == null) delete next[c.id];
                                  else next[c.id] = val;
                                  return next;
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            )
          )}
        </Spin>

        <p className="text-xs text-muted-foreground m-0">
          Only the downloaded file changes. Your store prices stay the same.
        </p>

        <Checkbox checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)}>
          Include product image links
        </Checkbox>
      </div>
    </Modal>
  );
}
