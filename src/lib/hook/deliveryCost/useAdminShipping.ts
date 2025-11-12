import { useState, useCallback } from "react";
import {
  getShippingFees,
  StoreShippingConfig,
  ShippingOption,
} from "@/lib/queries/deliveryCost/getShippingFees";
import { updateShippingFees } from "@/lib/queries/deliveryCost/updateShippingFees";
import { createShippingFees } from "@/lib/queries/deliveryCost/createShippingFees";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface UseAdminShippingReturn {
  shippingConfig: StoreShippingConfig | null;
  loading: boolean;
  error: string | null;
  fetchShippingFees: () => Promise<void>;
  updateFees: (updates: {
    shipping_options?: ShippingOption[];
    free_shipping_threshold?: number;
    processing_time_days?: number;
  }) => Promise<boolean>;
  createFees: (config: {
    currency: string;
    shipping_options: ShippingOption[];
    free_shipping_threshold?: number;
    processing_time_days?: number;
  }) => Promise<boolean>;
  refetch: () => Promise<void>;
  clearError: () => void;
  isUpdating: boolean;
}

export function useAdminShipping(storeSlug: string): UseAdminShippingReturn {
  const [shippingConfig, setShippingConfig] =
    useState<StoreShippingConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: errorToast, info } = useSheiNotification();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchShippingFees = useCallback(async () => {
    if (!storeSlug) {
      setError("Store slug is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const config = await getShippingFees(storeSlug);
      setShippingConfig(config);

      if (config?.shipping_options.length === 0) {
        info("No shipping options configured. Add your first shipping method.");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch shipping fees";
      setError(errorMessage);
      errorToast(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [storeSlug, errorToast, info]);

  const updateFees = useCallback(
    async (updates: {
      shipping_options?: ShippingOption[];
      free_shipping_threshold?: number;
      processing_time_days?: number;
    }): Promise<boolean> => {
      if (!shippingConfig?.store_id) {
        const errorMsg = "Store ID not found";
        setError(errorMsg);
        errorToast(errorMsg);
        return false;
      }

      try {
        setIsUpdating(true);
        setError(null);

        const result = await updateShippingFees(
          shippingConfig.store_id,
          updates
        );

        if (result.success) {
          success("Shipping options updated successfully!");
          await fetchShippingFees();
          return true;
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update shipping fees";
        setError(errorMessage);
        errorToast(errorMessage);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [shippingConfig?.store_id, fetchShippingFees, success, errorToast]
  );

  const createFees = useCallback(
    async (config: {
      currency: string;
      shipping_options: ShippingOption[];
      free_shipping_threshold?: number;
      processing_time_days?: number;
    }): Promise<boolean> => {
      if (!shippingConfig?.store_id) {
        const errorMsg = "Store ID not found";
        setError(errorMsg);
        errorToast(errorMsg);
        return false;
      }

      try {
        setIsUpdating(true);
        setError(null);

        const result = await createShippingFees(
          shippingConfig.store_id,
          config
        );

        if (result.success) {
          success("Shipping configuration created successfully!");
          await fetchShippingFees();
          return true;
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create shipping fees";
        setError(errorMessage);
        errorToast(errorMessage);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [shippingConfig?.store_id, fetchShippingFees, success, errorToast]
  );

  return {
    shippingConfig,
    loading,
    error,
    fetchShippingFees,
    updateFees,
    createFees,
    refetch: fetchShippingFees,
    clearError,
    isUpdating,
  };
}
