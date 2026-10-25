"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useBranches } from "@/lib/context/BranchContext";
import { getStockInsights } from "@/lib/queries/stock/getStockInsights";
import type { StockInsights } from "@/lib/queries/stock/stockInsightTypes";

interface UseStockInsightsResult {
  data: StockInsights | null;
  loading: boolean;
  /** Why it couldn't load (e.g. no permission); null when fine. */
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Sales speed and stock health for the store (or the branch picked in the
 * header), for the Stock Health and Reorder List pages.
 * @returns the data, loading flag, any error, and a reload function
 */
export function useStockInsights(): UseStockInsightsResult {
  const { storeId, loading: userLoading } = useCurrentUser();
  const { enabled: branchesOn, loading: branchesLoading, selectedBranchId } = useBranches();
  const branchId = branchesOn ? selectedBranchId : null;

  const [data, setData] = useState<StockInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!storeId || userLoading || branchesLoading) return;
    setLoading(true);
    try {
      const result = await getStockInsights(storeId, branchId);
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else {
        setData(null);
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  }, [storeId, userLoading, branchesLoading, branchId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
