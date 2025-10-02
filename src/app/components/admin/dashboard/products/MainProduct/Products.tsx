"use client";

import React, { useEffect, useState, useCallback } from "react";
import ProductTable from "./ProductTable";
import {
  getProductsWithVariants,
  ProductWithVariants,
} from "@/lib/queries/products/getProductsWithVariants";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

const Products: React.FC = () => {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useCurrentUser();

  // ✅ wrap fetch in useCallback so it can be reused
  const fetchProducts = useCallback(async () => {
    if (!user?.store_id) return;
    setLoading(true);
    try {
      const res = await getProductsWithVariants(user.store_id);
      setProducts(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.store_id]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <ProductTable
      products={products}
      loading={loading}
      onDeleteSuccess={fetchProducts} // 🔹 refresh after delete
    />
  );
};

export default Products;
