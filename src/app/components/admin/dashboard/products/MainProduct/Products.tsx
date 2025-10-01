"use client";

import React, { useEffect, useState } from "react";
import ProductTable from "./ProductTable";
import {
  getProductsWithVariants,
  ProductWithVariants,
} from "@/lib/queries/products/getProductsWithVariants";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

const Products: React.FC = () => {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useCurrentUser();
  const notify = useSheiNotification();

  useEffect(() => {
    if (!user?.store_id) return;

    const storeId: string = user.store_id;

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await getProductsWithVariants(storeId);
        setProducts(res);
      } catch (err) {
        console.error(err);
        notify.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user?.store_id, notify]);

  return <ProductTable products={products} loading={loading} />;
};

export default Products;
