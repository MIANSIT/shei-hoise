/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/hooks/useCurrentCustomer.ts - UPDATED FOR GLOBAL CUSTOMER LOOKUP
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  timestamp: number;
  tabId?: string;
  authUserId?: string | null;
  email?: string | null;
} | null = null;

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const getTabId = () => {
  if (typeof window === 'undefined') return 'server';
  if (!window.tabId) {
    window.tabId = 'tab_' + Math.random().toString(36).substr(2, 9);
  }
  return window.tabId;
};

// Track active fetches per tab
const activeFetches = new Map<string, boolean>();

// Add global refresh function
let refreshListeners: (() => void)[] = [];

export function refreshCustomerData() {
  console.log('🔄 Manually refreshing global customer data');
  const currentTabId = getTabId();
  if (globalCustomerCache?.tabId === currentTabId) {
    globalCustomerCache = null;
  }
  activeFetches.set(currentTabId, false);
  
  // Notify all listeners
  refreshListeners.forEach(listener => listener());
}

declare global {
  interface Window {
    tabId?: string;
  }
}

export function useCurrentCustomer(storeSlug?: string) {
  const [customer, setCustomer] = useState<CurrentCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastAuthUserIdRef = useRef<string | null>(null);
  
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

  // Track form data email
  const formEmailRef = useRef<string | null>(null);
  
  useEffect(() => {
    formEmailRef.current = formData?.email || null;
  }, [formData?.email]);

  // Force refetch when auth user ID changes (login/logout)
  useEffect(() => {
    if (lastAuthUserIdRef.current !== authUserId) {
      console.log('🔄 Auth user ID changed, clearing cache and refetching', {
        old: lastAuthUserIdRef.current,
        new: authUserId
      });
      
      refreshCustomerData();
      lastAuthUserIdRef.current = authUserId;
    }
  }, [authUserId]);

  // Add refresh listener
  useEffect(() => {
    const handleRefresh = () => {
      console.log('📢 Received global refresh signal');
      setRefreshTrigger(prev => prev + 1);
    };
    
    refreshListeners.push(handleRefresh);
    
    return () => {
      refreshListeners = refreshListeners.filter(l => l !== handleRefresh);
    };
  }, []);

  // Memoized fetch function - NOW GLOBAL (not store-specific)
  const fetchCustomer = useCallback(async () => {
    const currentTabId = getTabId();
    
    // Skip if already fetching for this tab
    if (activeFetches.get(currentTabId) || !mountedRef.current) {
      return;
    }

    try {
      activeFetches.set(currentTabId, true);
      isFetchingRef.current = true;
      
      // Check if user just created account during checkout
      const isNewAccount = Boolean(
        justCreatedAccount && 
        createdAccountEmail && 
        createdAccountEmail === formEmailRef.current
      );
      
      const hasFormEmail = !!formEmailRef.current;
      
      // Skip cache if:
      // 1. We have formData email
      // 2. It's a new account
      // 3. User is not logged in
      // 4. Cache has different auth state
      const shouldSkipCache = hasFormEmail || isNewAccount || !isLoggedIn ||
        (globalCustomerCache?.authUserId !== authUserId);

      // Only use cache if we shouldn't skip it
      if (
        !shouldSkipCache &&
        globalCustomerCache &&
        globalCustomerCache.tabId === currentTabId &&
        Date.now() - globalCustomerCache.timestamp < CACHE_DURATION
      ) {
        console.log('📦 Using cached global customer data');
        if (mountedRef.current) {
          setCustomer(globalCustomerCache.customer);
          setLoading(false);
        }
        activeFetches.set(currentTabId, false);
        isFetchingRef.current = false;
        return;
      }

      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      console.log('🔍 Fetching global customer data');
      console.log('👤 Current auth state:', { 
        isLoggedIn, 
        authEmail, 
        authUserId,
        sessionUser: session?.user
      });

      let customerData: any = null;
      let customerFound = false;
      let searchEmail = null;

      // Determine which email to search with - PRIORITIZE formData email
      if (formEmailRef.current) {
        searchEmail = formEmailRef.current.toLowerCase().trim();
        console.log('📧 Using FORM email for search:', searchEmail);
      } else if (authEmail) {
        searchEmail = authEmail.toLowerCase().trim();
        console.log('📧 Using AUTH email for search:', searchEmail);
      }

      console.log('🔍 Global customer search parameters:', {
        searchEmail,
        authUserId,
        isLoggedIn,
      });

      // STRATEGY 1: Search by auth_user_id first (for logged in users)
      if (authUserId && isLoggedIn) {
        console.log('🎯 Searching by auth_user_id:', authUserId);
        
        // Find ANY customer with this auth_user_id
        const { data: customers, error: customerError } = await supabase
          .from("store_customers")
          .select(`
            id,
            email,
            name,
            phone,
            auth_user_id,
            profile_id
          `)
          .eq("auth_user_id", authUserId)
          .limit(1);

        if (customerError) {
          console.log('⚠️ No customer found with auth_user_id:', customerError.message);
        } else if (customers && customers.length > 0) {
          customerData = customers[0];
          customerFound = true;
          console.log('✅ Found customer by auth_user_id:', customerData);
        }
      }

      // STRATEGY 2: If still not found and we have an email, search by email
      if (!customerFound && searchEmail) {
        console.log('🎯 Searching by email:', searchEmail);
        
        // Find ANY customer with this email
        const { data: customers, error: customerError } = await supabase
          .from("store_customers")
          .select(`
            id,
            email,
            name,
            phone,
            auth_user_id,
            profile_id,
            created_at
          `)
          .eq("email", searchEmail)
          .limit(1);

        if (customerError) {
          console.log('⚠️ No customer found with email:', customerError.message);
        } else if (customers && customers.length > 0) {
          customerData = customers[0];
          customerFound = true;
          console.log('✅ Found customer by email:', {
            id: customerData.id,
            email: customerData.email,
            auth_user_id: customerData.auth_user_id,
          });
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
          email: customerData.email || searchEmail || '',
          name: customerData.name || '',
          phone: customerData.phone || null,
          auth_user_id: customerData.auth_user_id || null,
          profile: profile || null,
        };
      }

      console.log('🎯 FINAL GLOBAL CUSTOMER RESULT:', {
        customerFound,
        customer: resolvedCustomer ? {
          id: resolvedCustomer.id,
          email: resolvedCustomer.email,
          auth_user_id: resolvedCustomer.auth_user_id,
          hasAuthId: !!resolvedCustomer.auth_user_id
        } : null,
        isLoggedIn,
        searchEmail,
      });

      if (mountedRef.current) {
        // Update cache
        globalCustomerCache = {
          customer: resolvedCustomer,
          timestamp: Date.now(),
          tabId: currentTabId,
          authUserId: authUserId,
          email: searchEmail || undefined,
        };

        setCustomer(resolvedCustomer);
        setLoading(false);

        // Clear account creation flags
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
        setError(err as Error);
        setLoading(false);
        const currentTabId = getTabId();
        if (globalCustomerCache?.tabId === currentTabId) {
          globalCustomerCache = null;
        }
      }
    } finally {
      const currentTabId = getTabId();
      activeFetches.set(currentTabId, false);
      isFetchingRef.current = false;
    }
  }, [authUserId, authLoading, justCreatedAccount, createdAccountEmail, isLoggedIn, authEmail, session, refreshTrigger]);

  // Main effect
  useEffect(() => {
    mountedRef.current = true;
    const currentTabId = getTabId();
    
    // Function to handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isFetchingRef.current) {
        fetchCustomer();
      }
    };

    // Initial fetch
    if (!activeFetches.get(currentTabId)) {
      fetchCustomer();
    }

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      isFetchingRef.current = false;
      activeFetches.set(currentTabId, false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCustomer]);

  const clearCache = () => {
    const currentTabId = getTabId();
    if (globalCustomerCache?.tabId === currentTabId) {
      globalCustomerCache = null;
    }
    activeFetches.set(currentTabId, false);
  };

  const manualRefresh = () => {
    refreshCustomerData();
  };

  return {
    customer,
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
    refresh: manualRefresh,
  };
}

export function clearCustomerCache() {
  globalCustomerCache = null;
  activeFetches.clear();
}