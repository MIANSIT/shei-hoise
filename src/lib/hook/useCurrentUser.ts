/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/hook/useCurrentUser.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CurrentUser, userSchema } from "../types/users";
import {
  getCustomerProfile,
  CustomerProfile,
} from "../queries/customers/getCustomerProfile";
import { useCheckoutStore } from "../store/userInformationStore";

export interface CurrentUserWithProfile extends CurrentUser {
  profile?: CustomerProfile | null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUserWithProfile | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null); // ✅ Added back storeSlug
  const [storeId, setStoreId] = useState<string | null>(null); // UUID
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ✅ Get form data from Zustand store
  const { formData } = useCheckoutStore();

  useEffect(() => {
    async function loadUser() {
      try {
        console.log("🔐 Loading user session...");

        const {
          data: { user: authUser },
          error: authErr,
        } = await supabase.auth.getUser();

        console.log("🔐 Auth user result:", { authUser, authErr });

        // Handle missing session (normal for unauthenticated users)
        if (authErr) {
          if (
            authErr.message?.includes("Auth session missing") ||
            authErr.name === "AuthSessionMissingError"
          ) {
            console.log(
              "🔐 No auth session found - user is not logged in (this is normal)"
            );
            setUser(null);
            setStoreSlug(null); // ✅ Reset storeSlug
            setLoading(false);
            return;
          }
          console.error("🔐 Actual auth error:", authErr);
          throw authErr;
        }

        if (!authUser) {
          console.log("🔐 No auth user found - user is not logged in");
          setUser(null);
          setStoreSlug(null); // ✅ Reset storeSlug
          setLoading(false);
          return;
        }

        // ✅ Check if we already have user data in Zustand for this user
        if (formData.email === authUser.email && formData.name) {
          console.log("🔐 Using cached user data from Zustand store");
          const cachedUser: CurrentUserWithProfile = {
            id: authUser.id,
            email: formData.email,
            first_name: formData.name.split(" ")[0] || formData.name,
            last_name: formData.name.split(" ")[1] || "",
            phone: formData.phone || null,
            store_id: null,
            user_type: "customer" as any, // Default to customer
            profile: {
              user_id: authUser.id,
              city: formData.city || undefined,
              country: formData.country || undefined,
              postal_code: formData.postCode || undefined,
              address_line_1: formData.shippingAddress || undefined,
            },
          };

          setUser(cachedUser);
          setStoreSlug(null); // ✅ Set storeSlug to null for cached users
          setLoading(false);
          return;
        }

        console.log("🔐 Fetching fresh user data from database...");

        // Fetch basic user data
        const { data: userData, error: dbErr } = await supabase
          .from("users")
          .select(
            "id, email, first_name, last_name, phone, store_id, user_type"
          )
          .eq("id", authUser.id)
          .single();

        if (dbErr) {
          console.error("🔐 Database error:", dbErr);
          throw dbErr;
        }

        console.log("🔐 Raw user data from DB:", userData);

        // Parse and validate user data
        const parsedUser = userSchema.parse(userData);

        // ✅ Fetch store slug (from previous version)
        let userStoreSlug: string | null = null;
        if (parsedUser.store_id) {
          console.log(
            "🔐 Fetching store slug for store_id:",
            parsedUser.store_id
          );
          const { data: storeData, error: storeErr } = await supabase
            .from("stores")
            .select("store_slug")
            .eq("id", parsedUser.store_id)
            .single();

          if (storeErr) {
            console.error("🔐 Store slug fetch error:", storeErr);
          } else {
            userStoreSlug = storeData?.store_slug || null;
            console.log("🔐 Store slug found:", userStoreSlug);
          }
        }

        // Fetch user profile data
        let userProfile: CustomerProfile | null = null;
        try {
          userProfile = await getCustomerProfile(authUser.id);
          console.log("🏠 User profile data:", userProfile);
        } catch (profileError) {
          console.log(
            "ℹ️ No profile found or error fetching profile:",
            profileError
          );
        }

        // Combine user data with profile
        const userWithProfile: CurrentUserWithProfile = {
          ...parsedUser,
          profile: userProfile,
        };

        console.log("👤 Current User with Profile loaded:", userWithProfile);
        setUser(userWithProfile);
        setStoreSlug(userStoreSlug); // ✅ Set the store slug
        setStoreId(parsedUser.store_id || null); // ✅ Set storeId for dashboard
      } catch (err) {
        console.error("💥 useCurrentUser error:", err);
        setError(err as Error);
        setUser(null);
        setStoreSlug(null); // ✅ Reset storeSlug on error
        setStoreId(null); // ✅ reset storeId as well
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [formData]); // ✅ Add formData as dependency

  return {
    user,
    storeSlug, // ✅ Added back storeSlug
    loading,
    error,
    role: user?.user_type,
    profile: user?.profile,
    storeId,
  };
}
