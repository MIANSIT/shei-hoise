"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Collapse,
  Input,
  InputNumber,
  Modal,
  Table,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { LoadingOutlined } from "@ant-design/icons";
import { FileDown, FileSpreadsheet } from "lucide-react";
import type { ProductWithStock } from "@/lib/queries/products/getProductWithStock";
import {
  applyMarkup,
  buildTraderItems,
  collectCategories,
  countMissingTp,
  exportTraderPricing,
  type TraderExportFormat,
  type TraderPriceItem,
  type TraderPriceRow,
  UNCATEGORISED,
} from "@/lib/types/products/exportTraderPricing";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface TraderPriceExportModalProps {
  open: boolean;
  onClose: () => void;
  /** Fetches every product matching the current filters, all pages. */
  fetchAllProducts: () => Promise<ProductWithStock[]>;
  storeSlug?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

function TraderPriceExportModal({
  open,
  onClose,
  fetchAllProducts,
  storeSlug,
}: TraderPriceExportModalProps) {
  const { success, error, info } = useSheiNotification();
  const { currency } = useUserCurrencyIcon();
  const symbol = currency
    ? (CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency)
    : "$";

  const [items, setItems] = useState<TraderPriceItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<TraderExportFormat | null>(null);

  const [traderName, setTraderName] = useState("");
  const [defaultPct, setDefaultPct] = useState<number>(20);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [categoryPcts, setCategoryPcts] = useState<Record<string, number>>({});

  // Load once, on first open. Re-loading on every open would discard the
  // overrides the user has already typed. `loadedRef` rather than a state
  // check because React 18 mounts effects twice in dev StrictMode, which would
  // otherwise fire two fetches.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;

    let cancelled = false;
    setLoading(true);
    fetchAllProducts()
      .then((products) => {
        if (!cancelled) setItems(buildTraderItems(products));
      })
      .catch((err) => {
        console.error("[TraderPriceExportModal] load failed:", err);
        loadedRef.current = false; // allow a retry on next open
        if (!cancelled) error("Couldn't load products. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, fetchAllProducts, error]);

  const rows: TraderPriceRow[] = useMemo(
    () =>
      items ? applyMarkup(items, defaultPct, overrides, categoryPcts) : [],
    [items, defaultPct, overrides, categoryPcts],
  );

  const categories = useMemo(
    () => (items ? collectCategories(items) : []),
    [items],
  );

  const missingTp = useMemo(
    () => (items ? countMissingTp(items) : 0),
    [items],
  );
  const overrideCount = Object.keys(overrides).length;
  const categoryCount = Object.keys(categoryPcts).length;

  const handleExport = async (format: TraderExportFormat) => {
    if (!rows.length) {
      info("No products to export. Try adjusting your filters.");
      return;
    }
    setExporting(format);
    try {
      await exportTraderPricing(
        format,
        rows,
        storeSlug,
        symbol,
        traderName.trim() || undefined,
      );
      success(`${rows.length} line${rows.length !== 1 ? "s" : ""} exported.`);
    } catch (err) {
      console.error("[TraderPriceExportModal] export failed:", err);
      error("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const columns: ColumnsType<TraderPriceRow> = [
    {
      title: "Product",
      dataIndex: "productName",
      key: "productName",
      ellipsis: true,
      render: (name: string, r) => (
        <div className="min-w-0">
          <p className="m-0 text-[13px] font-medium truncate">{name}</p>
          {r.variantName && r.variantName !== "-" && (
            <p className="m-0 text-[11px] text-gray-400 truncate">
              {r.variantName}
            </p>
          )}
        </div>
      ),
    },
    {
      title: `TP (${symbol})`,
      dataIndex: "tpPrice",
      key: "tpPrice",
      width: 110,
      align: "right",
      render: (tp: number | null) =>
        tp == null ? (
          <Tooltip title="No TP price set on this item — it will be blank in the sheet">
            <span className="text-amber-500 text-[12px]">not set</span>
          </Tooltip>
        ) : (
          tp.toFixed(2)
        ),
    },
    {
      title: "Category",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 150,
      ellipsis: true,
      render: (name: string | null) =>
        name ? (
          <span className="text-[12px] text-gray-500">{name}</span>
        ) : (
          <span className="text-[12px] text-gray-300">—</span>
        ),
    },
    {
      title: "Markup %",
      key: "markup",
      width: 160,
      align: "right",
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Which tier is driving this row — blank when it's just the
              store-wide default, so only the exceptions draw the eye. */}
          {r.markupSource !== "default" && (
            <Tooltip
              title={
                r.markupSource === "product"
                  ? "Set on this product — overrides its category"
                  : "From this product's category rate"
              }
            >
              <span
                className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${
                  r.markupSource === "product"
                    ? "bg-indigo-50 text-indigo-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {r.markupSource === "product" ? "item" : "cat"}
              </span>
            </Tooltip>
          )}
          <InputNumber
            size="small"
            min={0}
            max={1000}
            step={1}
            value={r.markupPercent}
            className="w-21.5"
            onChange={(val) =>
              setOverrides((prev) => {
                const next = { ...prev };
                // Clearing the override when the typed value matches whatever
                // this row would inherit anyway keeps the row following its
                // category (or the default) if that rate later changes.
                const inherited =
                  categoryPcts[r.categoryId ?? UNCATEGORISED] ?? defaultPct;
                if (val == null || val === inherited) delete next[r.key];
                else next[r.key] = val;
                return next;
              })
            }
          />
        </div>
      ),
    },
    {
      title: `Trader price (${symbol})`,
      dataIndex: "traderPrice",
      key: "traderPrice",
      width: 140,
      align: "right",
      render: (tp: number | null) =>
        tp == null ? (
          <span className="text-gray-300">—</span>
        ) : (
          <span className="font-semibold text-emerald-600">{tp.toFixed(2)}</span>
        ),
    },
    {
      title: `Retail (${symbol})`,
      dataIndex: "sellingPrice",
      key: "sellingPrice",
      width: 110,
      align: "right",
      render: (p: number) => (
        <span className="text-gray-400">{p.toFixed(2)}</span>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Export price sheet for trader"
      width={920}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="csv"
          icon={
            exporting === "csv" ? <LoadingOutlined /> : <FileDown size={14} />
          }
          disabled={exporting !== null || !rows.length}
          onClick={() => handleExport("csv")}
        >
          CSV
        </Button>,
        <Button
          key="xlsx"
          type="primary"
          icon={
            exporting === "xlsx" ? (
              <LoadingOutlined />
            ) : (
              <FileSpreadsheet size={14} />
            )
          }
          disabled={exporting !== null || !rows.length}
          onClick={() => handleExport("xlsx")}
        >
          Excel (.xlsx)
        </Button>,
      ]}
    >
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-[12px] text-gray-500 mb-1">
            Trader name (optional)
          </label>
          <Input
            placeholder="e.g. Karim Traders"
            value={traderName}
            onChange={(e) => setTraderName(e.target.value)}
            className="w-55"
          />
        </div>

        <div>
          <label className="block text-[12px] text-gray-500 mb-1">
            Markup on all products
          </label>
          <InputNumber
            min={0}
            max={1000}
            step={1}
            value={defaultPct}
            onChange={(v) => setDefaultPct(v ?? 0)}
            addonAfter="%"
            className="w-35"
          />
        </div>

        {(overrideCount > 0 || categoryCount > 0) && (
          <Button
            size="small"
            onClick={() => {
              setOverrides({});
              setCategoryPcts({});
            }}
            className="mb-1"
          >
            Reset {overrideCount + categoryCount} custom rate
            {overrideCount + categoryCount !== 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {/* ── Per-category rates ── */}
      {categories.length > 0 && (
        <Collapse
          size="small"
          className="mb-4"
          // Open by default: this is the main reason to use this screen rather
          // than the plain export, so it shouldn't be hidden behind a click.
          defaultActiveKey={["categories"]}
          items={[
            {
              key: "categories",
              label: (
                <span className="text-[13px] font-medium">
                  Markup by category
                  <span className="ml-2 text-[11px] font-normal text-gray-400">
                    {categories.length} categor
                    {categories.length === 1 ? "y" : "ies"}
                  </span>
                  {categoryCount > 0 && (
                    <span className="ml-2 text-[11px] font-semibold text-amber-600">
                      {categoryCount} set
                    </span>
                  )}
                </span>
              ),
              children: (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-[12.5px] text-muted-foreground truncate">
                        {c.name}
                        <span className="ml-1.5 text-[11px] text-gray-400">
                          ({c.lineCount})
                        </span>
                      </span>
                      <InputNumber
                        size="small"
                        min={0}
                        max={1000}
                        step={1}
                        // Empty means "inherit the store-wide rate" rather than
                        // showing a value the user never chose.
                        value={categoryPcts[c.id] ?? null}
                        placeholder={String(defaultPct)}
                        addonAfter="%"
                        className="w-35 shrink-0"
                        onChange={(val) =>
                          setCategoryPcts((prev) => {
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
      )}

      <Alert
        type="info"
        showIcon
        className="mb-4"
        message={
          <span className="text-[12.5px]">
            Trader price = TP price + markup. Change the box above to move every
            product at once, or edit any single row&apos;s Markup % to override
            it. The downloaded sheet shows only the trader price and the retail
            price — your cost and the markup stay here.
          </span>
        }
      />

      {missingTp > 0 && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message={
            <span className="text-[12.5px]">
              {missingTp} item{missingTp !== 1 ? "s have" : " has"} no TP price
              set, so there is no cost to mark up — those rows will be blank in
              the sheet.
            </span>
          }
        />
      )}

      <Table<TraderPriceRow>
        rowKey="key"
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 8, size: "small", showSizeChanger: false }}
        scroll={{ x: 700 }}
      />
    </Modal>
  );
}

export default memo(TraderPriceExportModal);
