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

// Mounted copies of the hook, so a save elsewhere can make them reload.
const refreshListeners = new Set<() => void>();

function invalidateSharedAuthUser() {
  cachedAuthUserPromise = null;
  inFlightProfile = null;
}

/* =======================
   SHARED PROFILE FETCH
   Same idea for the users + stores lookups: copies of the hook that mount
   together (before globalUserCache is filled) share one in-flight request
   instead of each running their own. The result lands in globalUserCache,
   which serves every later mount.
======================= */
interface ResolvedProfile {
  user: CurrentUserWithProfile;
  storeSlug: string | null;
  storeId: string | null;
  storeStatus: string | null;
  storeIsActive: boolean | null;
}

let inFlightProfile: { authUserId: string; promise: Promise<ResolvedProfile> } | null = null;

async function loadProfile(authUser: User): Promise<ResolvedProfile> {
  const { data: userData, error: dbErr } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, phone, store_id, user_type")
    .eq("id", authUser.id)
    .maybeSingle();

  // Customer fallback
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
    return { user: fallbackUser, storeSlug: null, storeId: null, storeStatus: null, storeIsActive: null };
  }

  const parsedUser = userSchema.parse(userData);

  let storeSlug: string | null = null;
  let storeStatus: string | null = null;
  let storeIsActive: boolean | null = null;

  if (parsedUser.store_id) {
    const { data: storeData } = await supabase
      .from("stores")
      .select("id, store_slug, status, is_active")
      .eq("id", parsedUser.store_id)
      .single();

    if (storeData) {
      storeSlug = storeData.store_slug ?? null;
      storeStatus = storeData.status ?? null;
      storeIsActive = storeData.is_active ?? null;
    }
  }

  return {
    user: { ...parsedUser, profile: null },
    storeSlug,
    storeId: parsedUser.store_id || null,
    storeStatus,
    storeIsActive,
  };
}

function getSharedProfile(authUser: User): Promise<ResolvedProfile> {
  if (inFlightProfile?.authUserId === authUser.id) return inFlightProfile.promise;

  const promise = loadProfile(authUser)
    .then((resolved) => {
      globalUserCache = { ...resolved, timestamp: Date.now() };
      return resolved;
    })
    .finally(() => {
      if (inFlightProfile?.promise === promise) inFlightProfile = null;
    });
  inFlightProfile = { authUserId: authUser.id, promise };
  return promise;
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
    let hasLoaded = false;

    const fetchUser = async (authUser: User | null) => {
      if (!mounted) return;
      currentAuthUser = authUser;

      try {
        /* =======================
           LOGOUT
        ======================= */
        if (!authUser) {
          hasLoaded = false;
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
          hasLoaded = true;
          setUser(globalUserCache.user);
          setStoreSlug(globalUserCache.storeSlug);
          setStoreId(globalUserCache.storeId);
          setStoreStatus(globalUserCache.storeStatus);
          setStoreIsActive(globalUserCache.storeIsActive);
          setLoading(false);
          return;
        }

        // Only the first load is a "loading" state. A later refresh (cache
        // expired, token refreshed, tab refocused) runs silently — flipping
        // loading back on made the dashboard swap itself for a spinner and
        // remount the page, wiping an open add/edit product form.
        if (!hasLoaded) setLoading(true);
        setError(null);

        const resolved = await getSharedProfile(authUser);
        if (!mounted) return;

        hasLoaded = true;
        setUser(resolved.user);
        setStoreSlug(resolved.storeSlug);
        setStoreId(resolved.storeId);
        setStoreStatus(resolved.storeStatus);
        setStoreIsActive(resolved.storeIsActive);
        setLoading(false);
      } catch (err) {
        console.error("❌ useCurrentUser error:", err);
        hasLoaded = false;
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
       REFRESH ON DEMAND (see refreshCurrentUser)
    ======================= */
    const onRefresh = () => {
      if (currentAuthUser) fetchUser(currentAuthUser);
    };
    refreshListeners.add(onRefresh);

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
      refreshListeners.delete(onRefresh);
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

/**
 * Call after saving something the header/sidebar shows (profile name, store
 * name/slug). Drops the 2-minute cache and makes every mounted copy of the
 * hook reload now, silently (no spinner), so the new value shows right away.
 */
export function refreshCurrentUser() {
  clearUserCache();
  refreshListeners.forEach((listener) => listener());
}

/* =======================
   REFRESH ON RETURN TO TAB
   A change made by someone else (an admin editing a staff role, a store
   status approval) can't reach this browser, so reload the user when the
   tab is shown again — silently, and at most every 30 seconds.
======================= */
const FOCUS_REFRESH_MIN_AGE = 30 * 1000;

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || refreshListeners.size === 0) return;
    if (globalUserCache && Date.now() - globalUserCache.timestamp < FOCUS_REFRESH_MIN_AGE) return;
    refreshCurrentUser();
  });
}
