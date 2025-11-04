"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CurrentUser, userSchema } from "../types/users";
import {
  getCustomerProfile,
  CustomerProfile,
} from "../queries/customers/getCustomerProfile";
import { useCheckoutStore } from "../store/userInformationStore";
import { User } from "@supabase/supabase-js";

export interface CurrentUserWithProfile extends CurrentUser {
  profile?: CustomerProfile | null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUserWithProfile | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { formData } = useCheckoutStore();

  useEffect(() => {
    let mounted = true;

    const fetchUser = async (authUser: User | null) => {
      try {
        if (!authUser) {
          if (mounted) {
            setUser(null);
            setStoreSlug(null);
            setStoreId(null);
            setLoading(false);
          }
          return;
        }

        // Fetch user from DB
        const { data: userData, error: dbErr } = await supabase
          .from("users")
          .select(
            "id, email, first_name, last_name, phone, store_id, user_type"
          )
          .eq("id", authUser.id)
          .single();

        if (dbErr) throw dbErr;

        const parsedUser = userSchema.parse(userData);

        // Fetch store slug
        let userStoreSlug: string | null = null;
        if (parsedUser.store_id) {
          const { data: storeData } = await supabase
            .from("stores")
            .select("store_slug")
            .eq("id", parsedUser.store_id)
            .single();
          userStoreSlug = storeData?.store_slug || null;
        }

        // Fetch profile
        let userProfile: CustomerProfile | null = null;
        try {
          userProfile = await getCustomerProfile(authUser.id);
        } catch {
          /* ignore */
        }

        if (mounted) {
          setUser({ ...parsedUser, profile: userProfile });
          setStoreSlug(userStoreSlug);
          setStoreId(parsedUser.store_id || null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setUser(null);
          setStoreSlug(null);
          setStoreId(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Initial load
    supabase.auth
      .getUser()
      .then(({ data: { user: authUser } }) => fetchUser(authUser));

    // ✅ Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUser(session?.user ?? null);
    });

    // ✅ Cleanup: properly unsubscribe
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
