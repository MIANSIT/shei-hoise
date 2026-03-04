"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button, Input, Space, Pagination } from "antd";
import { useRouter } from "next/navigation";
import { SearchOutlined, PlusOutlined } from "@ant-design/icons";
import ProductTable from "./ProductTable";
import {
  getProductsWithVariants,
  ProductWithVariants,
} from "@/lib/queries/products/getProductsWithVariants";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useUrlSync, parseInteger } from "@/lib/hook/filterWithUrl/useUrlSync";
import { ProductStatus } from "@/lib/types/enums";
import MobileFilter from "@/app/components/admin/common/MobileFilter";

const statusConfig = [
  { key: "ALL", label: "All Products" },
  { key: ProductStatus.ACTIVE, label: "Active" },
  { key: ProductStatus.INACTIVE, label: "Inactive" },
  { key: ProductStatus.DRAFT, label: "Draft" },
];

const Products: React.FC = () => {
  const router = useRouter();
  const { user } = useCurrentUser();

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

  const [localSearch, setLocalSearch] = useState(search);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<ProductStatus | "ALL", number>>({
    [ProductStatus.ACTIVE]: 0,
    [ProductStatus.INACTIVE]: 0,
    [ProductStatus.DRAFT]: 0,
    ALL: 0,
  });

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
      });
      setProducts(res.data);
      setTotal(res.total);
      setCounts(res.counts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, search, page, pageSize, status]);

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

  const handleAddProduct = () => router.push("/dashboard/products/add-product");

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 leading-tight">
            Products
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Manage your catalogue · {counts.ALL} total items
          </p>
        </div>

        {/* Add Product — desktop */}
        <button
          onClick={handleAddProduct}
          className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-sm font-semibold shadow-lg shadow-indigo-500/30 transition-all duration-150 cursor-pointer"
        >
          <PlusOutlined className="text-base" />
          Add Product
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search */}
        <div className="w-full md:max-w-sm">
          <Space.Compact className="w-full">
            <Input
              placeholder="Search products…"
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

        {/* Status pills — desktop */}
        <div className="hidden md:flex items-center gap-1.5 flex-wrap">
          {statusConfig.map(({ key, label }) => {
            const isActive = status === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setStatus(key as ProductStatus | "ALL");
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
                  {counts[key as ProductStatus | "ALL"] ?? 0}
                </span>
              </button>
            );
          })}
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
              setPage(1);
            }}
            getLabel={(s) =>
              `${statusConfig.find((c) => c.key === s)?.label ?? s} (${counts[s as ProductStatus | "ALL"] ?? 0})`
            }
          />
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <ProductTable
          products={products}
          loading={loading}
          pagination={undefined}
          onDeleteSuccess={fetchProducts}
        />
      </div>

      {/* ── Mobile Pagination ── */}
      <div className="md:hidden flex flex-col items-center gap-2 pt-1">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {total > 0
            ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} items`
            : "No items"}
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            ← Prev
          </button>
          <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 px-1">
            {page} / {Math.ceil(total / pageSize) || 1}
          </span>
          <button
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            Next →
          </button>
        </div>
      </div>

      {/* ── Desktop Pagination ── */}
      <div className="hidden md:flex items-center justify-between pt-1">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {total > 0
            ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} products`
            : "No products found"}
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
        aria-label="Add Product"
        className="md:hidden fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-xl shadow-xl shadow-indigo-500/40 flex items-center justify-center transition-all duration-150 cursor-pointer"
      >
        <PlusOutlined />
      </button>
    </div>
  );
};

export default Products;
