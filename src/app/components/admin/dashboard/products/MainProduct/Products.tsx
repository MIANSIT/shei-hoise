"use client";

import React, { useEffect, useState } from "react";
import ProductTable from "./ProductTable";
import { getProductsWithVariants, ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

const Products: React.FC = () => {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useCurrentUser();
  const notify = useSheiNotification();

  useEffect(() => {
    // ✅ run only when the store_id actually changes
    if (!user?.store_id) return;

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await getProductsWithVariants(user.store_id);
        setProducts(res);
      } catch (err) {
        console.error(err);
        notify.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user?.store_id]);

  return <ProductTable products={products} loading={loading} />;
};

export default Products;
