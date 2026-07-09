"use client";

import { useEffect, useState } from "react";
import {
  getStoreSubscription,
  type StoreSubscription,
} from "@/lib/queries/subscription/getStoreSubscription";
import { hasFeature } from "@/lib/utils/planFeatures";

/** Fetches the store's subscription once and checks a single plan feature flag — shared by every page/component that needs a FeatureLocked gate. */
export function useFeatureGate(storeId: string | null | undefined, featureKey: string) {
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    getStoreSubscription(storeId)
      .then(setSubscription)
      .finally(() => setLoading(false));
  }, [storeId]);

  return { loading, allowed: hasFeature(subscription, featureKey), subscription };
}
