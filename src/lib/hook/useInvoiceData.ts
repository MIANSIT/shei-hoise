// lib/hook/useInvoiceData.ts
import { useState, useEffect } from "react";
import { getStoreBySlug } from "@/lib/queries/stores/getStoreBySlug";

export interface StoreInvoiceData {
  id: string;
  store_name: string;
  store_slug: string;
  business_address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

export function useInvoiceData(storeSlug: string) {
  const [storeData, setStoreData] = useState<StoreInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!storeSlug) {
          setError("Store slug is required");
          setLoading(false);
          return;
        }
        
        const store = await getStoreBySlug(storeSlug);
        
        if (store) {
          setStoreData({
            id: store.id,
            store_name: store.store_name,
            store_slug: store.store_slug,
            business_address: store.business_address,
            contact_phone: store.contact_phone,
            contact_email: store.contact_email,
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
  }, [storeSlug]);

  return {
    storeData,
    loading,
    error,
  };
}