// lib/hook/useInvoiceData.ts
import { useState, useEffect } from "react";
import { getStoreBySlug } from "@/lib/queries/stores/getStoreBySlug";
import { getStoreById } from "@/lib/queries/stores/getStoreById";
// import type { StoreSettings } from "@/lib/types/store/store"; // Import from centralized types
import { getStoreSettings } from "@/lib/queries/stores/getStoreSettings";
export interface StoreInvoiceData {
  id: string;
  store_name: string;
  store_slug: string;
  business_address: string | null;
  contact_phone: string | null;
  logo_url: string | null; // ✅ ADD THIS
  contact_email: string | null;
  tax_rate: number;
}

interface UseInvoiceDataProps {
  storeSlug?: string;
  storeId?: string;
}

export function useInvoiceData({ storeSlug, storeId }: UseInvoiceDataProps) {
  const [storeData, setStoreData] = useState<StoreInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setLoading(true);
        setError(null);

        // If neither storeSlug nor storeId is provided
        if (!storeSlug && !storeId) {
          setError("Store slug or store ID is required");
          setLoading(false);
          return;
        }

        let store = null;

        // Priority 1: Try to get store by slug first
        if (storeSlug) {
          store = await getStoreBySlug(storeSlug);
        }

        // Priority 2: If slug method failed or no slug provided, try by ID
        if (!store && storeId) {
          store = await getStoreById(storeId);
        }
        if (store) {
          const settings = await getStoreSettings(store.id);

          setStoreData({
            id: store.id,
            store_name: store.store_name,
            store_slug: store.store_slug,
            business_address: store.business_address ?? null,
            contact_phone: store.contact_phone || "",
            contact_email: store.contact_email || "",
            logo_url: store.logo_url ?? null, // ✅ MAP FROM stores TABLE
            tax_rate: settings?.tax_rate || 0,
          });
        } else {
          setError("Store not found");
        }
      } catch (err) {
        console.error("Error fetching store data:", err);
        setError("Failed to load store information");
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [storeSlug, storeId]);

  return {
    storeData,
    loading,
    error,
  };
}
