// lib/hook/useCurrentUser.ts - Fixed version
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CurrentUser, userSchema, USERTYPE } from "../types/users"; // Import USERTYPE
import { CustomerProfile } from "../types/customer";
import { useCheckoutStore } from "../store/userInformationStore";
import { User } from "@supabase/supabase-js";

export interface CurrentUserWithProfile extends CurrentUser {
  profile?: CustomerProfile | null;
}

let globalUserCache: {
  user: CurrentUserWithProfile | null;
  storeSlug: string | null;
  storeId: string | null;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 2 * 60 * 1000;

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUserWithProfile | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { formData } = useCheckoutStore();

  useEffect(() => {
    let mounted = true;
    let currentAuthUser: User | null = null;

    const fetchUser = async (authUser: User | null) => {
      if (!mounted) return;

      currentAuthUser = authUser;

      try {
        if (!authUser) {
          setUser(null);
          setStoreSlug(null);
          setStoreId(null);
          setLoading(false);
          globalUserCache = null;
          return;
        }

        // Check cache first
        if (
          globalUserCache &&
          Date.now() - globalUserCache.timestamp < CACHE_DURATION
        ) {
          console.log("📦 Using global cached user data for:", authUser.id);
          setUser(globalUserCache.user);
          setStoreSlug(globalUserCache.storeSlug);
          setStoreId(globalUserCache.storeId);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        // Fetch user from DB - use maybeSingle() instead of single()
        const { data: userData, error: dbErr } = await supabase
          .from("users")
          .select("id, email, first_name, last_name, phone, store_id, user_type")
          .eq("id", authUser.id)
          .maybeSingle();

        // If user doesn't exist in users table, it's okay - they might be a customer
        if (dbErr || !userData) {
          console.log("⚠️ User not found in users table - likely a customer:", authUser.id);
          
          // Create a minimal user object from auth data
          const fallbackUser: CurrentUserWithProfile = {
            id: authUser.id,
            email: authUser.email || "",
            first_name: authUser.user_metadata?.first_name || "",
            last_name: authUser.user_metadata?.last_name || "",
            phone: authUser.user_metadata?.phone || null,
            store_id: null,
            user_type: USERTYPE.CUSTOMER, // Use enum value instead of string
            profile: null,
          };

          if (mounted) {
            globalUserCache = {
              user: fallbackUser,
              storeSlug: null,
              storeId: null,
              timestamp: Date.now(),
            };

            setUser(fallbackUser);
            setStoreSlug(null);
            setStoreId(null);
            setLoading(false);
          }
          return;
        }

        // Parse the user data
        const parsedUser = userSchema.parse(userData);

        // Fetch store slug if user has store_id
        let userStoreSlug: string | null = null;
        if (parsedUser.store_id) {
          const { data: storeData } = await supabase
            .from("stores")
            .select("store_slug, store_name")
            .eq("id", parsedUser.store_id)
            .single();
          userStoreSlug = storeData?.store_slug || null;
        }

        const userWithProfile: CurrentUserWithProfile = {
          ...parsedUser,
          profile: null,
        };

        if (mounted) {
          globalUserCache = {
            user: userWithProfile,
            storeSlug: userStoreSlug,
            storeId: parsedUser.store_id || null,
            timestamp: Date.now(),
          };

          setUser(userWithProfile);
          setStoreSlug(userStoreSlug);
          setStoreId(parsedUser.store_id || null);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error("Error in useCurrentUser:", err);
          setError(err as Error);
          setUser(null);
          setStoreSlug(null);
          setStoreId(null);
          setLoading(false);
          globalUserCache = null;
        }
      }
    };

    // Initial load
    supabase.auth
      .getUser()
      .then(({ data: { user: authUser } }) => {
        if (mounted) {
          fetchUser(authUser);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (currentAuthUser && session?.user?.id !== currentAuthUser.id) {
          globalUserCache = null;
        }
        fetchUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [formData]);

  return {
    user,
    storeSlug,
    storeId,
    loading,
    error,
    role: user?.user_type as string,
    profile: user?.profile,
  };
}

export function clearUserCache() {
  globalUserCache = null;
}