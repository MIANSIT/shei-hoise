/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/hooks/useCurrentCustomer.ts - FIXED CACHE LOGIC
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useCheckoutStore } from "../store/userInformationStore";
import { CustomerProfile } from "../types/customer";
import { useSupabaseAuth } from "./userCheckAuth";

export interface CurrentCustomer {
  id: string;
  email: string;
  auth_user_id?: string | null;
  profile?: CustomerProfile | null;
  name?: string;
  phone?: string;
}

// Cache with tab focus protection
let globalCustomerCache: {
  customer: CurrentCustomer | null;
  storeId: string | null;
  storeSlug: string | null;
  timestamp: number;
  tabId?: string;
} | null = null;

const CACHE_DURATION = 10 * 60 * 1000;

const getTabId = () => {
  if (typeof window === 'undefined') return 'server';
  if (!window.tabId) {
    window.tabId = 'tab_' + Math.random().toString(36).substr(2, 9);
  }
  return window.tabId;
};

declare global {
  interface Window {
    tabId?: string;
  }
}

export function useCurrentCustomer(storeSlug?: string) {
  const [customer, setCustomer] = useState<CurrentCustomer | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  
  const { session, loading: authLoading } = useSupabaseAuth();
  
  const isLoggedIn = Boolean(session?.user);
  const authEmail = session?.user?.email || null;
  const authUserId = session?.user?.id || null;

  const { 
    formData, 
    justCreatedAccount, 
    createdAccountEmail,
    clearAccountCreationFlags 
  } = useCheckoutStore();

  useEffect(() => {
    mountedRef.current = true;
    const currentTabId = getTabId();
    
    const fetchCustomer = async () => {
      if (isFetchingRef.current || !mountedRef.current || !storeSlug || authLoading) {
        return;
      }

      try {
        isFetchingRef.current = true;
        
        // ✅ Check if user just created account during checkout
        const isNewAccount = Boolean(
          justCreatedAccount && 
          createdAccountEmail && 
          createdAccountEmail === formData?.email
        );
        
        // CRITICAL FIX: Check if we have formData email
        const hasFormEmail = !!formData?.email;
        
        // Skip cache if:
        // 1. We have formData email (guest checkout scenario)
        // 2. It's a new account
        // 3. User is not logged in (guest checkout)
        const shouldSkipCache = hasFormEmail || isNewAccount || !isLoggedIn;
        
        if (
          globalCustomerCache &&
          globalCustomerCache.storeSlug === storeSlug &&
          globalCustomerCache.tabId === currentTabId &&
          Date.now() - globalCustomerCache.timestamp < CACHE_DURATION &&
          !shouldSkipCache // Only use cache if we should NOT skip it
        ) {
          console.log('📦 Using cached customer data (same tab)');
          if (mountedRef.current) {
            setCustomer(globalCustomerCache.customer);
            setStoreId(globalCustomerCache.storeId);
            setLoading(false);
          }
          isFetchingRef.current = false;
          return;
        }

        if (mountedRef.current) {
          setLoading(true);
          setError(null);
        }

        console.log('🔍 Fetching store by slug:', storeSlug);
        console.log('👤 Auth state:', { 
          isLoggedIn, 
          authEmail, 
          authUserId,
          hasSession: !!session
        });
        console.log('📝 Form data:', { 
          formEmail: formData?.email,
          justCreatedAccount,
          createdAccountEmail,
          hasFormEmail
        });

        // Resolve store
        const { data: store, error: storeError } = await supabase
          .from("stores")
          .select("id")
          .eq("store_slug", storeSlug)
          .single();

        if (storeError) {
          console.error('❌ Store not found:', storeError);
          throw new Error("Store not found");
        }

        const resolvedStoreId = store.id;
        console.log('🏪 Store ID resolved:', resolvedStoreId);

        let customerData: any = null;
        let customerFound = false;
        let searchEmail = null;

        // Determine which email to search with - PRIORITIZE formData email
        if (formData?.email) {
          searchEmail = formData.email.toLowerCase().trim();
          console.log('📧 Using FORM email for search:', searchEmail);
        } else if (authEmail) {
          searchEmail = authEmail.toLowerCase().trim();
          console.log('📧 Using AUTH email for search:', searchEmail);
        }

        console.log('🔍 Customer search parameters:', {
          searchEmail,
          authUserId,
          isLoggedIn,
          hasFormEmail: !!formData?.email,
          hasAuthEmail: !!authEmail,
        });

        // STRATEGY: Always try to find customer by email first (from form data)
        if (searchEmail) {
          console.log('🎯 Searching for ANY customer by email:', searchEmail);
          
          const { data: customerLink, error: customerError } = await supabase
            .from("store_customer_links")
            .select(`
              customer_id,
              store_customers!inner (
                id,
                email,
                name,
                phone,
                auth_user_id,
                profile_id,
                created_at
              )
            `)
            .eq("store_id", resolvedStoreId)
            .eq("store_customers.email", searchEmail)
            .maybeSingle(); // Use maybeSingle instead of single

          if (customerError) {
            console.log('⚠️ No customer found with email:', customerError.message);
          } else if (customerLink?.store_customers) {
            customerData = customerLink.store_customers;
            customerFound = true;
            console.log('✅ Found customer by email:', {
              id: customerData.id,
              email: customerData.email,
              auth_user_id: customerData.auth_user_id,
              created_at: customerData.created_at
            });
          } else {
            console.log('⚠️ Customer link found but no store_customer data');
          }
        }

        // If still not found and user is logged in, try by auth_user_id
        if (!customerFound && authUserId && isLoggedIn) {
          console.log('🔍 Fallback: Searching by auth_user_id:', authUserId);
          
          const { data: authCustomerLink, error: authLinkError } = await supabase
            .from("store_customer_links")
            .select(`
              customer_id,
              store_customers!inner (
                id,
                email,
                name,
                phone,
                auth_user_id,
                profile_id
              )
            `)
            .eq("store_id", resolvedStoreId)
            .eq("store_customers.auth_user_id", authUserId)
            .maybeSingle();

          if (authLinkError) {
            console.log('⚠️ No authenticated customer found:', authLinkError.message);
          } else if (authCustomerLink?.store_customers) {
            customerData = authCustomerLink.store_customers;
            customerFound = true;
            console.log('✅ Found customer by auth_user_id:', customerData);
          }
        }

        let resolvedCustomer: CurrentCustomer | null = null;
        
        if (customerFound && customerData) {
          // Fetch profile separately if profile_id exists
          let profile = null;
          if (customerData.profile_id) {
            const { data: profileData } = await supabase
              .from("customer_profiles")
              .select("*")
              .eq("id", customerData.profile_id)
              .single();
            profile = profileData;
          }

          resolvedCustomer = {
            id: customerData.id,
            email: customerData.email || '',
            name: customerData.name || '',
            phone: customerData.phone || null,
            auth_user_id: customerData.auth_user_id || null,
            profile: profile || null,
          };
        }

        console.log('🎯 FINAL RESULT:', {
          customerFound,
          customer: resolvedCustomer ? {
            id: resolvedCustomer.id,
            email: resolvedCustomer.email,
            auth_user_id: resolvedCustomer.auth_user_id,
            hasAuthId: !!resolvedCustomer.auth_user_id
          } : null,
          isLoggedIn,
          searchEmail,
          shouldShowCompleteAccount: !isLoggedIn && resolvedCustomer && !resolvedCustomer.auth_user_id,
          shouldShowSignIn: !isLoggedIn && resolvedCustomer && resolvedCustomer.auth_user_id,
        });

        if (mountedRef.current) {
          // Update cache with tab ID
          globalCustomerCache = {
            customer: resolvedCustomer,
            storeId: resolvedStoreId,
            storeSlug,
            timestamp: Date.now(),
            tabId: currentTabId,
          };

          setCustomer(resolvedCustomer);
          setStoreId(resolvedStoreId);
          setLoading(false);

          // Clear account creation flags after successful fetch
          if (isNewAccount) {
            console.log('🧹 Clearing account creation flags');
            setTimeout(() => {
              if (mountedRef.current) {
                clearAccountCreationFlags();
              }
            }, 2000);
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          console.error("❌ useCurrentCustomer error:", err);
          setCustomer(null);
          setStoreId(null);
          setError(err as Error);
          setLoading(false);
          if (globalCustomerCache?.tabId === currentTabId) {
            globalCustomerCache = null;
          }
        }
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchCustomer();

    return () => {
      mountedRef.current = false;
      isFetchingRef.current = false;
    };
  }, [storeSlug, authUserId, authLoading, formData?.email, session]); 

  const clearCache = () => {
    globalCustomerCache = null;
  };

  return {
    customer,
    storeId,
    loading: loading || authLoading,
    error,
    isAuthenticated: !!customer?.auth_user_id && isLoggedIn,
    hasAuthUserId: !!customer?.auth_user_id,
    hasProfile: !!customer?.profile,
    profile: customer?.profile ?? null,
    isLoggedIn,
    authEmail,
    authUserId,
    clearCache,
  };
}

export function clearCustomerCache() {
  globalCustomerCache = null;
}