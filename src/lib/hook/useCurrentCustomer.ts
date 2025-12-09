// lib/hooks/useCurrentCustomer.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useCheckoutStore } from "../store/userInformationStore";
import { CustomerProfile } from "../types/customer";

export interface CurrentCustomer {
  id: string;
  email: string;
  auth_user_id?: string | null;
  profile?: CustomerProfile | null;
}

/* ------------------------------------------------------------------ */
/* Global cache (shared across app)                                    */
/* ------------------------------------------------------------------ */
let globalCustomerCache: {
  customer: CurrentCustomer | null;
  storeId: string | null;
  storeSlug: string | null;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */
export function useCurrentCustomer(storeSlug?: string) {
  const [customer, setCustomer] = useState<CurrentCustomer | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { formData } = useCheckoutStore();

  useEffect(() => {
    let mounted = true;
    let currentAuthUser: User | null = null;

    const fetchCustomer = async (authUser: User | null) => {
      if (!mounted || !storeSlug) return;

      currentAuthUser = authUser;

      try {
        /* ------------------------------------------------------------ */
        /* Cache check                                                  */
        /* ------------------------------------------------------------ */
        if (
          globalCustomerCache &&
          globalCustomerCache.storeSlug === storeSlug &&
          Date.now() - globalCustomerCache.timestamp < CACHE_DURATION
        ) {
          setCustomer(globalCustomerCache.customer);
          setStoreId(globalCustomerCache.storeId);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        /* ------------------------------------------------------------ */
        /* Resolve store                                                */
        /* ------------------------------------------------------------ */
        const { data: store } = await supabase
          .from("stores")
          .select("id")
          .eq("store_slug", storeSlug)
          .single();

        if (!store) throw new Error("Store not found");

        const resolvedStoreId = store.id;

        let customerData: any = null;

        /* ------------------------------------------------------------ */
        /* 1️⃣ Authenticated customer                                   */
        /* ------------------------------------------------------------ */
        if (authUser) {
          const { data } = await supabase
            .from("store_customers")
            .select(
              `
              id,
              email,
              auth_user_id,
              customer_profiles (*),
              store_customer_links!inner (store_id)
            `
            )
            .eq("auth_user_id", authUser.id)
            .eq("store_customer_links.store_id", resolvedStoreId)
            .single();

          customerData = data;
        }

        /* ------------------------------------------------------------ */
        /* 2️⃣ Guest / email fallback                                   */
        /* ------------------------------------------------------------ */
        if (!customerData && formData?.email) {
          const email = formData.email.toLowerCase().trim();

          const { data } = await supabase
            .from("store_customers")
            .select(
              `
              id,
              email,
              auth_user_id,
              customer_profiles (*),
              store_customer_links!inner (store_id)
            `
            )
            .eq("email", email)
            .eq("store_customer_links.store_id", resolvedStoreId)
            .single();

          customerData = data;
        }

        const resolvedCustomer: CurrentCustomer | null = customerData
          ? {
              id: customerData.id,
              email: customerData.email,
              auth_user_id: customerData.auth_user_id,
              profile: customerData.customer_profiles?.[0] ?? null,
            }
          : null;

        if (mounted) {
          globalCustomerCache = {
            customer: resolvedCustomer,
            storeId: resolvedStoreId,
            storeSlug,
            timestamp: Date.now(),
          };

          setCustomer(resolvedCustomer);
          setStoreId(resolvedStoreId);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error("❌ useCurrentCustomer error:", err);
          setCustomer(null);
          setStoreId(null);
          setError(err as Error);
          setLoading(false);
          globalCustomerCache = null;
        }
      }
    };

    /* -------------------------------------------------------------- */
    /* Initial fetch                                                   */
    /* -------------------------------------------------------------- */
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) fetchCustomer(user);
    });

    /* -------------------------------------------------------------- */
    /* Auth subscription                                              */
    /* -------------------------------------------------------------- */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (currentAuthUser?.id !== session?.user?.id) {
        globalCustomerCache = null;
      }
      fetchCustomer(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [storeSlug, formData?.email]);

  return {
    customer,
    storeId,
    loading,
    error,
    isAuthenticated: !!customer?.auth_user_id,
    hasProfile: !!customer?.profile,
    profile: customer?.profile ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Utility                                                            */
/* ------------------------------------------------------------------ */
export function clearCustomerCache() {
  globalCustomerCache = null;
}
