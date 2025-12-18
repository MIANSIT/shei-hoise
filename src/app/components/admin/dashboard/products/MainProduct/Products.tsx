"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button, Input, Space, Pagination } from "antd";
// import { Plus, Filter as FilterIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { SearchOutlined } from "@ant-design/icons";

import ProductTable from "./ProductTable";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";
import {
  getProductsWithVariants,
  ProductWithVariants,
} from "@/lib/queries/products/getProductsWithVariants";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useUrlSync, parseInteger } from "@/lib/hook/filterWithUrl/useUrlSync";
import { ProductStatus } from "@/lib/types/enums";
import MobileFilter from "@/app/components/admin/common/MobileFilter"; // adjust path if needed
import { Plus } from "lucide-react";

const Products: React.FC = () => {
  const router = useRouter();
  const { user } = useCurrentUser();

  // =========================
  // URL-synced state
  // =========================
  const [search, setSearch] = useUrlSync<string>("search", "", (v) => v ?? "");
  const [page, setPage] = useUrlSync<number>("page", 1, parseInteger);
  const [pageSize, setPageSize] = useUrlSync<number>(
    "pageSize",
    10,
    parseInteger
  );
  const [status, setStatus] = useUrlSync<ProductStatus | "ALL">(
    "status",
    "ALL",
    (v) => v as ProductStatus | "ALL"
  );

  // =========================
  // Local state
  // =========================
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

  // =========================
  // Fetch products + counts
  // =========================
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

  // =========================
  // Debounced search & URL sync
  // =========================
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
        setPage(1); // Reset to first page on new search
      }
    }, 100);

    return () => clearTimeout(handler);
  }, [localSearch, search, setSearch, setPage]);

  // =========================
  // Actions
  // =========================
  const handleAddProduct = () => {
    router.push("/dashboard/products/add-product");
  };

  const statusLabels: Record<string, string> = {
    ALL: "All",
    active: "Active",
    inactive: "Inactive",
    draft: "Draft",
  };

  return (
    <div className="space-y-4">
      {/* Top bar: Search + Add Product */}
      <div className="space-y-3">
        {/* Row 1: Search bar */}
        <div className="w-full md:w-1/2">
          <Space.Compact className="w-full">
            <Input
              placeholder="Search products by Name"
              allowClear
              size="large"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
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
        {/* Row 2: Status filter left + Add Product right */}

        {/* Row 2: Status filter left + Add Product right */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          {/* Left: MobileFilter or desktop buttons */}
          <MobileFilter<ProductStatus | "ALL">
            value={status}
            defaultValue="ALL"
            options={[
              "ALL",
              ProductStatus.ACTIVE,
              ProductStatus.INACTIVE,
              ProductStatus.DRAFT,
            ]}
            onChange={setStatus}
            getLabel={(s) =>
              `${statusLabels[s]} (${counts[s as ProductStatus | "ALL"] ?? 0})`
            }
          />

          {/* Desktop: normal buttons */}
          <div className="hidden md:flex gap-2 flex-wrap">
            {[
              "ALL",
              ProductStatus.ACTIVE,
              ProductStatus.INACTIVE,
              ProductStatus.DRAFT,
            ].map((s) => (
              <Button
                key={s}
                type={status === s ? "primary" : "default"}
                onClick={() => setStatus(s as ProductStatus | "ALL")}
              >
                {statusLabels[s]} ({counts[s as ProductStatus | "ALL"] ?? 0})
              </Button>
            ))}
          </div>

          {/* Right: Add Product */}
          <SheiButton
            onClick={handleAddProduct}
            title="Add Product"
            type="primary"
            className="flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-transform transform hover:scale-105 w-full md:w-auto"
          >
            Add Product <Plus className="w-5 h-5 ml-2" />
          </SheiButton>
        </div>
      </div>

      {/* Product Table */}
      <ProductTable
        products={products}
        loading={loading}
        pagination={undefined} // Disable table pagination; global pagination is used
        onDeleteSuccess={fetchProducts}
      />

      {/* Mobile pagination */}
      <div className="md:hidden flex flex-col items-center gap-2 mt-4">
        <div className="text-sm text-gray-600">
          {total > 0
            ? `Showing ${(page - 1) * pageSize + 1}-${Math.min(
                page * pageSize,
                total
              )} of ${total} items`
            : "No items"}
        </div>

        <div className="flex gap-2">
          <Button
            size="small"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center text-sm">
            Page {page} of {Math.ceil(total / pageSize) || 1}
          </span>
          <Button
            size="small"
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Desktop pagination */}
      <div className="hidden md:flex justify-end mt-4">
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
          showTotal={(total, range) =>
            `${range[0]}-${range[1]} of ${total} items`
          }
        />
      </div>
    </div>
  );
};

export default Products;
