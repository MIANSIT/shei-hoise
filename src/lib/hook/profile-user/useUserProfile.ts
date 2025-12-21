// lib/hook/profile-user/useUserProfile.ts
"use client";

import { useState, useEffect } from "react";
import { useCurrentCustomer } from "../useCurrentCustomer";
import { useCurrentUser } from "../useCurrentUser";
import { getUserProfile, UserWithProfile } from "@/lib/queries/user/getUserProfile";
import { getAdminProfile, AdminUserWithProfile } from "@/lib/queries/user/getAdminUser";
import { useParams } from "next/navigation";
import { USERTYPE } from "@/lib/types/users";

export function useUserProfile() {
  const params = useParams();
  const storeSlug = params.store_slug as string;
  
  // Use both hooks
  const { 
    customer, 
    loading: customerLoading, 
    error: customerError,
    isLoggedIn: customerIsLoggedIn,
    authUserId: customerAuthUserId,
    hasAuthUserId
  } = useCurrentCustomer(storeSlug);
  
  const {
    user: adminUser,
    loading: adminLoading,
    error: adminError,
    storeSlug: adminStoreSlug,
    role
  } = useCurrentUser();
  
  const [userProfile, setUserProfile] = useState<UserWithProfile | AdminUserWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('👤 User profile check:', {
          hasCustomer: !!customer,
          hasAdminUser: !!adminUser,
          customerIsLoggedIn,
          customerAuthUserId,
          role,
          storeSlug
        });

        // DECISION LOGIC:
        // 1. If we have a store customer with auth_user_id → Show customer profile
        // 2. If we have an admin/store_owner user → Show admin profile
        // 3. Otherwise → No profile

        // Scenario 1: Store customer with authentication
        if (customer?.auth_user_id && customerIsLoggedIn && customerAuthUserId === customer.auth_user_id) {
          console.log('✅ Fetching authenticated store customer profile:', customer.id);
          const profile = await getUserProfile(customer.id);
          setUserProfile(profile);
        }
        // Scenario 2: Admin or store_owner user
        else if (adminUser && role) {
          // Check if role is admin or store_owner using enum values
          const isAdmin = role === USERTYPE.ADMIN;
          const isStoreOwner = role === USERTYPE.STORE_OWNER;
          
          if (isAdmin || isStoreOwner) {
            console.log('👑 Fetching admin/store_owner profile:', adminUser.id);
            try {
              const adminProfile = await getAdminProfile(adminUser.id);
              setUserProfile(adminProfile);
            } catch (adminErr) {
              console.error('❌ Failed to fetch admin profile:', adminErr);
              // Fallback to basic admin user data
              const fallbackAdminProfile: AdminUserWithProfile = {
                ...adminUser,
                email_verified: false,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                store_slug: adminStoreSlug,
                store_name: null,
                profile: null,
                user_type: role as "admin" | "store_owner"
              };
              setUserProfile(fallbackAdminProfile);
            }
          }
        }
        else {
          console.log('❌ No user profile to fetch');
          setUserProfile(null);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch only when hooks are done loading
    if (!customerLoading && !adminLoading) {
      fetchUserProfile();
    }
  }, [
    customer, 
    customerLoading, 
    adminUser, 
    adminLoading, 
    customerIsLoggedIn, 
    customerAuthUserId, 
    role, 
    storeSlug,
    adminStoreSlug
  ]);

  // Helper function to check user type
  const isCustomer = userProfile?.user_type === USERTYPE.CUSTOMER;
  const isAdmin = userProfile?.user_type === USERTYPE.ADMIN;
  const isStoreOwner = userProfile?.user_type === USERTYPE.STORE_OWNER;

  return {
    user: userProfile,
    loading: customerLoading || adminLoading || loading,
    error: customerError || adminError || error,
    isAuthenticated: !!userProfile || (customer && hasAuthUserId && customerIsLoggedIn) || !!adminUser,
    isCustomer,
    isAdmin,
    isStoreOwner,
  };
}