// lib/hook/useStoreCurrency.ts
"use client";

import { useEffect, useState } from "react";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import type { StoreSettings } from "@/lib/types/store/store";
export interface UseStoreCurrencyResult {
  currency: string | null;
  loading: boolean;
  error: Error | null;
}

export function useStoreCurrency(
  storeId: string | null
): UseStoreCurrencyResult {
  const [currency, setCurrency] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!storeId) {
      setCurrency(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchCurrency = async () => {
      setLoading(true);
      setError(null);
      try {
        const storeSettings: StoreSettings | null = await getStoreSettings(
          storeId
        );
        if (mounted) setCurrency(storeSettings?.currency || null);
      } catch (err) {
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCurrency();
    return () => {
      mounted = false;
    };
  }, [storeId]);

  return { currency, loading, error };
}
