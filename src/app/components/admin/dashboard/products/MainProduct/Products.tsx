"use client";

import React, { useEffect, useState, useCallback } from "react";
import ProductTable from "./ProductTable";
import {
  getProductsWithVariants,
  ProductWithVariants,
} from "@/lib/queries/products/getProductsWithVariants";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { Input, Space } from "antd";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation"; // ✅ change here
import { SearchOutlined } from "@ant-design/icons";

const Products: React.FC = () => {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<
    ProductWithVariants[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useCurrentUser();
  const router = useRouter(); // ✅ use the hook

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
    router.push("/dashboard/products/add-product"); // ✅ works now
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="w-full md:w-1/3">
          <Space.Compact style={{ width: "100%" }}>
            <Input
              placeholder="Search products .... "
              allowClear
              size="large"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <SheiButton
              onClick={() => {}}
              title="Search"
              type="primary"
              className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white shadow-lg transition-transform transform hover:scale-105"
              style={{ height: 40 }} // match input height (AntD large ≈ 40px)
            >
              <SearchOutlined />
            </SheiButton>
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

      <ProductTable
        products={filteredProducts}
        loading={loading}
        onDeleteSuccess={fetchProducts}
      />
    </div>
  );
};

export default Products;
