"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CurrentUser, userSchema } from "../types/users";
import { USERTYPE } from "@/lib/types/enums"; // ← add this

import { CustomerProfile } from "../types/customer";
import { User } from "@supabase/supabase-js";

export interface CurrentUserWithProfile extends CurrentUser {
  profile?: CustomerProfile | null;
}

/* =======================
   GLOBAL CACHE
======================= */
let globalUserCache: {
  user: CurrentUserWithProfile | null;
  storeSlug: string | null;
  storeId: string | null;
  storeStatus: string | null;
  storeIsActive: boolean | null;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/* =======================
   SHARED AUTH-USER FETCH
   This hook mounts in ~39 places across the app (sidebar, layout, page,
   currency icon, etc.) — several of them simultaneously on one screen.
   Without this, every mount fired its own supabase.auth.getUser() call
   even though they all want the same answer. Caching the promise itself
   (not just the DB lookup below) means concurrent mounts share one
   in-flight request, and mounts within the cache window skip the network
   entirely.
======================= */
let cachedAuthUserPromise: Promise<User | null> | null = null;
let authUserCacheTimestamp = 0;

function getSharedAuthUser(): Promise<User | null> {
  const isFresh =
    cachedAuthUserPromise && Date.now() - authUserCacheTimestamp < CACHE_DURATION;
  if (isFresh) return cachedAuthUserPromise!;

  authUserCacheTimestamp = Date.now();
  cachedAuthUserPromise = supabase.auth
    .getUser()
    .then(({ data }) => data.user)
    .catch((err) => {
      cachedAuthUserPromise = null;
      throw err;
    });
  return cachedAuthUserPromise;
}

function invalidateSharedAuthUser() {
  cachedAuthUserPromise = null;
}

/* =======================
   HOOK
======================= */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUserWithProfile | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeStatus, setStoreStatus] = useState<string | null>(null);
  const [storeIsActive, setStoreIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let currentAuthUser: User | null = null;

    const fetchUser = async (authUser: User | null) => {
      if (!mounted) return;
      currentAuthUser = authUser;

      try {
        /* =======================
           LOGOUT
        ======================= */
        if (!authUser) {
          setUser(null);
          setStoreSlug(null);
          setStoreId(null);
          setStoreStatus(null);
          setStoreIsActive(null);
          setLoading(false);
          globalUserCache = null;
          invalidateSharedAuthUser();
          return;
        }

        /* =======================
           CACHE CHECK
        ======================= */
        if (
          globalUserCache &&
          Date.now() - globalUserCache.timestamp < CACHE_DURATION
        ) {
          setUser(globalUserCache.user);
          setStoreSlug(globalUserCache.storeSlug);
          setStoreId(globalUserCache.storeId);
          setStoreStatus(globalUserCache.storeStatus);
          setStoreIsActive(globalUserCache.storeIsActive);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        /* =======================
           FETCH USER
        ======================= */
        const { data: userData, error: dbErr } = await supabase
          .from("users")
          .select(
            "id, email, first_name, last_name, phone, store_id, user_type",
          )
          .eq("id", authUser.id)
          .maybeSingle();

        /* =======================
           CUSTOMER FALLBACK
        ======================= */
        if (dbErr || !userData) {
          const fallbackUser: CurrentUserWithProfile = {
            id: authUser.id,
            email: authUser.email || "",
            first_name: authUser.user_metadata?.first_name || "",
            last_name: authUser.user_metadata?.last_name || "",
            phone: authUser.user_metadata?.phone || null,
            store_id: null,
            user_type: USERTYPE.CUSTOMER,
            profile: null,
          };

          globalUserCache = {
            user: fallbackUser,
            storeSlug: null,
            storeId: null,
            storeStatus: null,
            storeIsActive: null,
            timestamp: Date.now(),
          };

          setUser(fallbackUser);
          setStoreSlug(null);
          setStoreId(null);
          setStoreStatus(null);
          setStoreIsActive(null);
          setLoading(false);
          return;
        }

        /* =======================
           PARSE USER
        ======================= */
        const parsedUser = userSchema.parse(userData);

        /* =======================
           FETCH STORE
        ======================= */
        let userStoreSlug: string | null = null;
        let userStoreStatus: string | null = null;
        let userStoreIsActive: boolean | null = null;

        if (parsedUser.store_id) {
          const { data: storeData } = await supabase
            .from("stores")
            .select("id, store_slug, status, is_active")
            .eq("id", parsedUser.store_id)
            .single();

          if (storeData) {
            userStoreSlug = storeData.store_slug ?? null;
            userStoreStatus = storeData.status ?? null;
            userStoreIsActive = storeData.is_active ?? null;
          }
        }

        const userWithProfile: CurrentUserWithProfile = {
          ...parsedUser,
          profile: null,
        };

        /* =======================
           SAVE CACHE + STATE
        ======================= */
        globalUserCache = {
          user: userWithProfile,
          storeSlug: userStoreSlug,
          storeId: parsedUser.store_id || null,
          storeStatus: userStoreStatus,
          storeIsActive: userStoreIsActive,
          timestamp: Date.now(),
        };

        setUser(userWithProfile);
        setStoreSlug(userStoreSlug);
        setStoreId(parsedUser.store_id || null);
        setStoreStatus(userStoreStatus);
        setStoreIsActive(userStoreIsActive);
        setLoading(false);
      } catch (err) {
        console.error("❌ useCurrentUser error:", err);
        setError(err as Error);
        setUser(null);
        setStoreSlug(null);
        setStoreId(null);
        setStoreStatus(null);
        setStoreIsActive(null);
        setLoading(false);
        globalUserCache = null;
        invalidateSharedAuthUser();
      }
    };

    /* =======================
       INITIAL LOAD
    ======================= */
    getSharedAuthUser()
      .then((user) => fetchUser(user))
      .catch((err) => {
        setError(err);
        setLoading(false);
      });

    /* =======================
       AUTH LISTENER
    ======================= */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (currentAuthUser && session?.user?.id !== currentAuthUser.id) {
        globalUserCache = null;
        invalidateSharedAuthUser();
      }
      fetchUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =======================
     RETURN
  ======================= */
  return {
    user,
    storeSlug,
    storeId,
    storeStatus,
    storeIsActive,
    loading,
    error,
    role: user?.user_type as string,
    profile: user?.profile,
  };
}

/* =======================
   MANUAL CACHE CLEAR
======================= */
export function clearUserCache() {
  globalUserCache = null;
  invalidateSharedAuthUser();
}
