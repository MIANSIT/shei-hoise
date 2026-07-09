"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button, Input, Space, Pagination, notification } from "antd";
import { useRouter } from "next/navigation";
import { SearchOutlined, PlusOutlined, DownloadOutlined } from "@ant-design/icons";
import { Star } from "lucide-react";
import ProductTable from "./ProductTable";
import {
  getProductsWithVariants,
  ProductWithVariants,
} from "@/lib/queries/products/getProductsWithVariants";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useUrlSync, parseInteger } from "@/lib/hook/filterWithUrl/useUrlSync";
import { ProductStatus } from "@/lib/types/enums";
import MobileFilter from "@/app/components/admin/common/MobileFilter";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

const Products: React.FC = () => {
  const t = useTranslation();
  const n = useLocalNum();
  const router = useRouter();
  const { user } = useCurrentUser();

  const statusConfig = [
    { key: "ALL", label: t.admin.allProductsFilter },
    { key: ProductStatus.ACTIVE, label: t.admin.activeFilter },
    { key: ProductStatus.INACTIVE, label: t.admin.inactiveFilter },
    { key: ProductStatus.DRAFT, label: t.admin.draftFilter },
  ];

  const [search, setSearch] = useUrlSync<string>("search", "", (v) => v ?? "");
  const [page, setPage] = useUrlSync<number>("page", 1, parseInteger);
  const [pageSize, setPageSize] = useUrlSync<number>(
    "pageSize",
    10,
    parseInteger,
  );
  const [status, setStatus] = useUrlSync<ProductStatus | "ALL">(
    "status",
    "ALL",
    (v) => v as ProductStatus | "ALL",
  );
  const [featuredOnly, setFeaturedOnly] = useUrlSync<boolean>(
    "featured",
    false,
    (v) => v === "true",
  );

  const [localSearch, setLocalSearch] = useState(search);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [counts, setCounts] = useState<Record<ProductStatus | "ALL", number>>({
    [ProductStatus.ACTIVE]: 0,
    [ProductStatus.INACTIVE]: 0,
    [ProductStatus.DRAFT]: 0,
    ALL: 0,
  });
  const [featuredCount, setFeaturedCount] = useState(0);

  const fetchProducts = useCallback(async () => {
    if (!user?.store_id) return;
    setLoading(true);
    try {
      const res = await getProductsWithVariants({
        storeId: user.store_id,
        search,
        page,
        pageSize,
        status: status === "ALL" ? undefined : status,
        featured: featuredOnly ? true : undefined,
      });
      setProducts(res.data);
      setTotal(res.total);
      setCounts(res.counts);
      setFeaturedCount(res.featuredCount);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, search, page, pageSize, status, featuredOnly]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
        setPage(1);
      }
    }, 100);
    return () => clearTimeout(handler);
  }, [localSearch, search, setSearch, setPage]);

  const handleDownloadProductsCsv = async () => {
    if (!user?.store_id) return;

    setExporting(true);
    try {
      const res = await getProductsWithVariants({
        storeId: user.store_id,
        search,
        status: status === "ALL" ? undefined : status,
        featured: featuredOnly ? true : undefined,
      });

      const productsToExport = res.data;
      if (!productsToExport?.length) {
        notification.info({
          message: t.admin.noProductsFound,
          description: t.admin.productNoProductsForDownload,
        });
        return;
      }

      const escape = (value: unknown): string => {
        if (value === null || value === undefined) return '""';
        const text = String(value).trim();
        if (!text) return '""';
        return `"${text.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
      };

      const rows: (string | number)[][] = [];

      for (const product of productsToExport) {
        const productAvailable =
          product.product_inventory?.reduce(
            (sum, item) => sum + (item.quantity_available ?? 0),
            0,
          ) ?? 0;
        const productReserved =
          product.product_inventory?.reduce(
            (sum, item) => sum + (item.quantity_reserved ?? 0),
            0,
          ) ?? 0;

        const baseRow = [
          product.id,
          product.name,
          product.slug,
          product.sku ?? "",
          product.category?.name ?? "",
          product.status,
          product.featured ? "Yes" : "No",
          product.base_price ?? 0,
          product.discounted_price ?? 0,
          productAvailable,
          productReserved,
        ];

        if (!product.product_variants?.length) {
          rows.push([...baseRow, "", "", "", "", "", "", "", "", "", "", ""]);
          continue;
        }

        for (const variant of product.product_variants) {
          const variantAvailable =
            variant.product_inventory?.reduce(
              (sum, item) => sum + (item.quantity_available ?? 0),
              0,
            ) ?? 0;
          const variantReserved =
            variant.product_inventory?.reduce(
              (sum, item) => sum + (item.quantity_reserved ?? 0),
              0,
            ) ?? 0;

          rows.push([
            ...baseRow,
            variant.id,
            variant.variant_name ?? "",
            variant.sku ?? "",
            variant.base_price ?? 0,
            variant.discounted_price ?? 0,
            variant.discount_amount ?? 0,
            variant.tp_price ?? 0,
            variant.weight ?? 0,
            variant.color ?? "",
            variant.is_active ? "Yes" : "No",
            variantAvailable,
            variantReserved,
          ]);
        }
      }

      const header = [
        "Product ID",
        "Name",
        "Slug",
        "Product SKU",
        "Category",
        "Status",
        "Featured",
        "Base Price",
        "Discounted Price",
        "Product Stock Available",
        "Product Stock Reserved",
        "Variant ID",
        "Variant Name",
        "Variant SKU",
        "Variant Base Price",
        "Variant Discounted Price",
        "Variant Discount Amount",
        "Variant TP Price",
        "Variant Weight",
        "Variant Color",
        "Variant Active",
        "Variant Stock Available",
        "Variant Stock Reserved",
      ];

      const csvContent = [header, ...rows]
        .map((row) => {
          return row.map((cell) => escape(cell)).join(",");
        })
        .join("\r\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `products_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notification.success({
        message: "Products downloaded",
        description: `CSV file downloaded successfully with ${rows.length} records.`,
      });
    } catch (error: any) {
      console.error("Failed to download products:", error);
      notification.error({
        message: t.admin.productDownloadFailed,
        description: error?.message || t.admin.productDownloadFailedDesc,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleAddProduct = () => router.push("/dashboard/products/add-product");

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 leading-tight">
            {t.admin.productsTitle}
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            {t.admin.productsManage} · {n(counts.ALL)} {t.admin.totalItems}
          </p>
        </div>

        {/* Add Product — desktop */}
        <button
          onClick={handleAddProduct}
          className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-sm font-semibold shadow-lg shadow-indigo-500/30 transition-all duration-150 cursor-pointer"
        >
          <PlusOutlined className="text-base" />
          {t.admin.addProductBtn}
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search */}
        <div className="w-full md:max-w-sm">
          <Space.Compact className="w-full">
            <Input
              placeholder={t.admin.searchProducts}
              allowClear
              size="large"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onPressEnter={() => {
                setSearch(localSearch);
                setPage(1);
              }}
            />
            <Button
              size="large"
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => {
                setSearch(localSearch);
                setPage(1);
              }}
            />
          </Space.Compact>
        </div>

        {/* Download button */}
        <div className="flex items-center gap-2">
          <Button
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={handleDownloadProductsCsv}
          >
            {t.admin.productDownloadCsv}
          </Button>
        </div>
      </div>

      {/* Status filters — visible on desktop, hidden on mobile */}
      <div className="hidden md:flex items-center gap-1.5 flex-wrap">
        {statusConfig.map(({ key, label }) => {
          const isActive = status === key && !featuredOnly;
          return (
            <button
              key={key}
              onClick={() => {
                setStatus(key as ProductStatus | "ALL");
                setFeaturedOnly(false);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer
                ${
                  isActive
                    ? "bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/25"
                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                }`}
            >
              {label}
              <span
                className={`inline-flex items-center justify-center min-w-5 h-4.5 px-1.5 rounded-full text-[10px] font-bold
                ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                }`}
              >
                {n(counts[key as ProductStatus | "ALL"] ?? 0)}
              </span>
            </button>
          );
        })}

        {/* Featured pill */}
        <button
          onClick={() => {
            setFeaturedOnly(!featuredOnly);
            setPage(1);
          }}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer
            ${
              featuredOnly
                ? "bg-amber-400 border-amber-400 text-white shadow-md shadow-amber-400/25"
                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-amber-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
            }`}
        >
          <Star
            className="w-3 h-3"
            fill={featuredOnly ? "currentColor" : "none"}
          />
          {t.admin.featuredFilter}
          <span
            className={`inline-flex items-center justify-center min-w-5 h-4.5 px-1.5 rounded-full text-[10px] font-bold
            ${
              featuredOnly
                ? "bg-white/20 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
            }`}
          >
            {n(featuredCount)}
          </span>
        </button>
      </div>

      {/* Status — mobile dropdown */}
      <div className="md:hidden">
        <MobileFilter<ProductStatus | "ALL">
          value={status}
          defaultValue="ALL"
          options={[
            "ALL",
            ProductStatus.ACTIVE,
            ProductStatus.INACTIVE,
            ProductStatus.DRAFT,
          ]}
          onChange={(v) => {
            setStatus(v);
            setFeaturedOnly(false);
            setPage(1);
          }}
          getLabel={(s) =>
            `${statusConfig.find((c) => c.key === s)?.label ?? s} (${n(counts[s as ProductStatus | "ALL"] ?? 0)})`
          }
        />
      </div>

      {/* ── Table Card ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <div className="overflow-x-auto">
          <ProductTable
            products={products}
            loading={loading}
            pagination={undefined}
            onDeleteSuccess={fetchProducts}
          />
        </div>
      </div>

      {/* ── Mobile Pagination ── */}
      <div className="md:hidden flex flex-col items-center gap-2 pt-1">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {total > 0
            ? `${n((page - 1) * pageSize + 1)}–${n(Math.min(page * pageSize, total))} ${t.admin.ofText} ${n(total)} ${t.admin.itemsLabel}`
            : t.admin.noItems}
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            {t.admin.prevBtn}
          </button>
          <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 px-1">
            {n(page)} / {n(Math.ceil(total / pageSize) || 1)}
          </span>
          <button
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            {t.admin.nextBtn}
          </button>
        </div>
      </div>

      {/* ── Desktop Pagination ── */}
      <div className="hidden md:flex items-center justify-between pt-1">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {total > 0
            ? `${t.admin.showingRange} ${n((page - 1) * pageSize + 1)}–${n(Math.min(page * pageSize, total))} ${t.admin.ofText} ${n(total)} ${t.admin.productsLabel}`
            : t.admin.noProductsFound}
        </p>
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger
          onChange={(newPage, newPageSize) => {
            setPage(newPage);
            if (newPageSize !== pageSize) {
              setPageSize(newPageSize);
              setPage(1);
            }
          }}
        />
      </div>

      {/* ── FAB — mobile ── */}
      <button
        onClick={handleAddProduct}
        aria-label={t.admin.addProductBtn}
        className="md:hidden fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-xl shadow-xl shadow-indigo-500/40 flex items-center justify-center transition-all duration-150 cursor-pointer"
      >
        <PlusOutlined />
      </button>
    </div>
  );
};

export default Products;
