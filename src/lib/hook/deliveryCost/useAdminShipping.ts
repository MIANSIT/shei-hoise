// hooks/useAdminShipping.ts
import { useState } from "react";
import {
  getShippingFees,
  StoreShippingConfig,
  ShippingOption,
} from "@/lib/queries/deliveryCost/getShippingFees";
import { updateShippingFees } from "@/lib/queries/deliveryCost/updateShippingFees";
import { createShippingFees } from "@/lib/queries/deliveryCost/createShippingFees";

export function useAdminShipping(storeSlug: string) {
  const [shippingConfig, setShippingConfig] =
    useState<StoreShippingConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View shipping fees
  const fetchShippingFees = async () => {
    try {
      setLoading(true);
      setError(null);
      const config = await getShippingFees(storeSlug);
      setShippingConfig(config);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch shipping fees"
      );
    } finally {
      setLoading(false);
    }
  };

  // Update shipping fees
  const updateFees = async (updates: {
    shipping_options?: ShippingOption[];
    free_shipping_threshold?: number;
    processing_time_days?: number;
  }): Promise<boolean> => {
    try {
      if (!shippingConfig?.store_id) {
        throw new Error("Store ID not found");
      }

      const result = await updateShippingFees(shippingConfig.store_id, updates);

      if (result.success) {
        // Refresh the data
        await fetchShippingFees();
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update shipping fees"
      );
      return false;
    }
  };

  // Create shipping fees
  const createFees = async (config: {
    currency: string;
    shipping_options: ShippingOption[];
    free_shipping_threshold?: number;
    processing_time_days?: number;
  }): Promise<boolean> => {
    try {
      if (!shippingConfig?.store_id) {
        throw new Error("Store ID not found");
      }

      const result = await createShippingFees(shippingConfig.store_id, config);

      if (result.success) {
        await fetchShippingFees();
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create shipping fees"
      );
      return false;
    }
  };

  return {
    shippingConfig,
    loading,
    error,
    fetchShippingFees,
    updateFees,
    createFees,
    refetch: fetchShippingFees,
  };
}
