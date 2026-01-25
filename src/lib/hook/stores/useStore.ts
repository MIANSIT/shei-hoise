"use client";

import { useEffect, useState } from "react";
import { getStoreById } from "@/lib/queries/stores/getStoreById";
import { getStoreSocialMedia } from "@/lib/queries/stores/getStoreSocialMedia";
import type { StoreData, StoreSocialMedia } from "@/lib/types/store/store";

export function useStore(storeId: string | null) {
  const [store, setStore] = useState<StoreData | null>(null);
  const [socialMedia, setSocialMedia] = useState<StoreSocialMedia | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!storeId) {
      setStore(null);
      setSocialMedia(null);
      return;
    }

    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const storeData = await getStoreById(storeId);
        const socialData = await getStoreSocialMedia(storeId);

        if (mounted) {
          setStore(storeData);
          setSocialMedia(socialData);
        }
      } catch (err) {
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [storeId]);

  return { store, socialMedia, setSocialMedia, loading, error };
}
