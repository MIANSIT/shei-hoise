// lib/hooks/useStore.ts
"use client";

import { useEffect, useState } from "react";
import { getStoreById } from "@/lib/queries/stores/getStoreById";
import { StoreData } from "@/lib/queries/stores/getStoreBySlug";

export function useStore(storeId: string | null) {
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!storeId) {
      setStore(null);
      return;
    }

    let mounted = true;

    const fetchStore = async () => {
      try {
        setLoading(true);
        const data = await getStoreById(storeId);
        if (mounted) setStore(data);
      } catch (err) {
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStore();

    return () => {
      mounted = false;
    };
  }, [storeId]);

  return { store, loading, error };
}
