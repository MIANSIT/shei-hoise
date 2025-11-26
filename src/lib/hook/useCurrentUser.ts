// lib/hook/useCurrentUser.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CurrentUser, userSchema } from "../types/users";
import { CustomerProfile } from "../types/customer";
import { useCheckoutStore } from "../store/userInformationStore";
import { User } from "@supabase/supabase-js";

export interface CurrentUserWithProfile extends CurrentUser {
  profile?: CustomerProfile | null;
}

// Global cache to prevent multiple API calls across the entire app
let globalUserCache: {
  user: CurrentUserWithProfile | null;
  storeSlug: string | null;
  storeId: string | null;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

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

        // Check global cache first - works across all files using useCurrentUser
        if (globalUserCache && Date.now() - globalUserCache.timestamp < CACHE_DURATION) {
          console.log('📦 Using global cached user data for:', authUser.id);
          setUser(globalUserCache.user);
          setStoreSlug(globalUserCache.storeSlug);
          setStoreId(globalUserCache.storeId);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        // Fetch user from DB
        const { data: userData, error: dbErr } = await supabase
          .from("users")
          .select("id, email, first_name, last_name, phone, store_id, user_type")
          .eq("id", authUser.id)
          .single();

        if (dbErr) throw dbErr;

        const parsedUser = userSchema.parse(userData);

        // Fetch store slug
        let userStoreSlug: string | null = null;
        if (parsedUser.store_id) {
          const { data: storeData } = await supabase
            .from("stores")
            .select("store_slug, store_name")
            .eq("id", parsedUser.store_id)
            .single();
          userStoreSlug = storeData?.store_slug || null;
        }

        // REMOVED: Profile fetching - it was using wrong ID and causing errors
        // Store owners don't have customer profiles anyway

        const userWithProfile: CurrentUserWithProfile = { 
          ...parsedUser, 
          profile: null // Always set to null since store owners don't have customer profiles
        };

        if (mounted) {
          // Update global cache - this will be shared across all components
          globalUserCache = {
            user: userWithProfile,
            storeSlug: userStoreSlug,
            storeId: parsedUser.store_id || null,
            timestamp: Date.now()
          };
          
          setUser(userWithProfile);
          setStoreSlug(userStoreSlug);
          setStoreId(parsedUser.store_id || null);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error in useCurrentUser:', err);
          setError(err as Error);
          setUser(null);
          setStoreSlug(null);
          setStoreId(null);
          setLoading(false);
          globalUserCache = null;
        }
      }
    };

    // Initial load - only run once
    supabase.auth
      .getUser()
      .then(({ data: { user: authUser } }) => {
        if (mounted) {
          fetchUser(authUser);
        }
      })
      .catch(err => {
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
        // Clear cache if user changes
        if (currentAuthUser && session?.user?.id !== currentAuthUser.id) {
          globalUserCache = null;
        }
        fetchUser(session?.user ?? null);
      }
    });

    // Cleanup
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
    role: user?.user_type,
    profile: user?.profile,
  };
}

// Export function to clear user cache if needed
export function clearUserCache() {
  globalUserCache = null;
}