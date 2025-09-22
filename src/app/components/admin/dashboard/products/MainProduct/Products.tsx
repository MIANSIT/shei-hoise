"use client";

import React, { useEffect, useState } from "react";
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

  const storeId = user?.store_id;

  useEffect(() => {
    if (!storeId) return;

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await getProductsWithVariants(storeId);
        setProducts(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [storeId]);

  return <ProductTable products={products} loading={loading} />;
};

export default Products;
