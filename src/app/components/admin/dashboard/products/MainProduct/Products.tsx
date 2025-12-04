"use client";

import React, { useEffect, useState, useCallback } from "react";
import ProductTable from "./ProductTable";
import {
  getProductsWithVariants,
  ProductWithVariants,
} from "@/lib/queries/products/getProductsWithVariants";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { Input } from "antd"; // ⬅️ ADD
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";
import { Plus } from "lucide-react";
import router from "next/router";
const { Search } = Input;

const Products: React.FC = () => {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<
    ProductWithVariants[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useCurrentUser();

  const fetchProducts = useCallback(async () => {
    if (!user?.store_id) return;
    setLoading(true);
    try {
      const res = await getProductsWithVariants(user.store_id);
      setProducts(res);
      setFilteredProducts(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.store_id]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 🔍 Search filter
  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts(products);
      return;
    }

    const lower = searchTerm.toLowerCase();
    setFilteredProducts(
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.category?.name?.toLowerCase().includes(lower)
      )
    );
  }, [searchTerm, products]);
  const handleAddProduct = () => {
    router.push("/dashboard/products/add-product");
  };

  return (
    <div className="space-y-4">
      {/* 🔎 AntD Search Input */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="w-full md:w-1/3">
          <Search
            placeholder="Search products .... "
            allowClear
            enterButton
            onChange={(e) => setSearchTerm(e.target.value)}
            size="large"
          />
        </div>

        {/* Add Product Button */}
        <SheiButton
          onClick={handleAddProduct}
          title="Add Product"
          type="primary"
          className="flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-transform transform hover:scale-105 w-full md:w-auto"
        >
          Add Product <Plus className="w-5 h-5 ml-2" />
        </SheiButton>
      </div>

      {/* Product Table */}
      <ProductTable
        products={filteredProducts}
        loading={loading}
        onDeleteSuccess={fetchProducts}
      />
    </div>
  );
};

export default Products;
