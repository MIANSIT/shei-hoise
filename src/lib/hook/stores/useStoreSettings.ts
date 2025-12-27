"use client";

import { useEffect, useState } from "react";
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
import type { StoreSettings } from "@/lib/types/store/store"; // IMPORT from centralized types

export function useStoreSettings(storeId: string | null) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!storeId) {
      setSettings(null);
      return;
    }

    let mounted = true;

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await getStoreSettings(storeId);
        if (mounted) setSettings(data);
      } catch (err) {
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSettings();

    return () => {
      mounted = false;
    };
  }, [storeId]);

  return { settings, loading, error };
}
