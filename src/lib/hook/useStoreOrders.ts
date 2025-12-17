"use client";

import { useState, useEffect } from "react";
import { StoreOrder } from "@/lib/types/order";
import { getStoreOrders } from "@/lib/queries/orders/getStoreOrders";

interface UseStoreOrdersResult {
  orders: StoreOrder[];
  totalAmount: number;
  loading: boolean;
  error: string | null;
}

export function useStoreOrders(storeId: string): UseStoreOrdersResult {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;

    async function fetchOrders() {
      setLoading(true);
      setError(null);

      try {
        const fetchedOrders = await getStoreOrders(storeId);

        setOrders(fetchedOrders.orders); // ✅ only the array
        setTotalAmount(fetchedOrders.total);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to fetch orders");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [storeId]);

  return { orders, totalAmount, loading, error };
}
