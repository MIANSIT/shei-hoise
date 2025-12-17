"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button, Input, Space } from "antd";
import { Plus } from "lucide-react";
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

const Products: React.FC = () => {
  const router = useRouter();
  const { user } = useCurrentUser();

  /* =========================
     URL-Synced State
  ========================= */

  const [search, setSearch] = useUrlSync<string>("search", "", (v) => v ?? "");
  const [page, setPage] = useUrlSync<number>("page", 1, parseInteger);
  const [pageSize, setPageSize] = useUrlSync<number>(
    "pageSize",
    10,
    parseInteger
  );

  /* =========================
     Local State
  ========================= */

  const [localSearch, setLocalSearch] = useState(search);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  /* =========================
     Fetch Products
  ========================= */

  const fetchProducts = useCallback(async () => {
    if (!user?.store_id) return;

    setLoading(true);
    try {
      const res = await getProductsWithVariants({
        storeId: user.store_id,
        search,
        page,
        pageSize,
      });

      setProducts(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, search, page, pageSize]);

  // Fetch products when search/page/pageSize changes
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* =========================
     Debounce search & sync URL
  ========================= */

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
        setPage(1); // Reset to first page on new search
      }
    }, 100);

    return () => clearTimeout(handler);
  }, [localSearch, search, setSearch, setPage]);

  /* =========================
     Actions
  ========================= */

  const handleAddProduct = () => {
    router.push("/dashboard/products/add-product");
  };

  /* =========================
     Render
  ========================= */

  return (
    <div className="space-y-4">
      {/* Top bar: Search + Add Product */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="w-full md:w-1/3">
          <Space.Compact className="w-full">
            <Input
              placeholder="Search products..."
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

        <SheiButton
          onClick={handleAddProduct}
          title="Add Product"
          type="primary"
          className="flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-transform transform hover:scale-105 w-full md:w-auto"
        >
          Add Product <Plus className="w-5 h-5 ml-2" />
        </SheiButton>
      </div>

      {/* Product Table with pagination */}
      <ProductTable
        products={products}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            if (newPageSize !== pageSize) {
              setPageSize(newPageSize);
              setPage(1); // Reset to first page when pageSize changes
            }
          },
        }}
        onDeleteSuccess={fetchProducts}
      />
    </div>
  );
};

export default Products;
