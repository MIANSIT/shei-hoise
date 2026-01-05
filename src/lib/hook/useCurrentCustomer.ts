/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/hooks/useCurrentCustomer.ts - UPDATED FOR BETTER AUTH LINKING
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

// Helper function to find or create customer
async function findOrCreateCustomer(email: string, authUserId: string | null, storeSlug?: string): Promise<CurrentCustomer | null> {
  try {
    
    // Try to find customer by auth_user_id first
    if (authUserId) {
      const { data: customersByAuth, error: authError } = await supabase
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

      if (!authError && customersByAuth && customersByAuth.length > 0) {
        return {
          id: customersByAuth[0].id,
          email: customersByAuth[0].email || email,
          name: customersByAuth[0].name || '',
          phone: customersByAuth[0].phone || null,
          auth_user_id: customersByAuth[0].auth_user_id,
          profile: null, // Will fetch separately if needed
        };
      }
    }

    // Try to find customer by email
    const { data: customersByEmail, error: emailError } = await supabase
      .from("store_customers")
      .select(`
        id,
        email,
        name,
        phone,
        auth_user_id,
        profile_id
      `)
      .eq("email", email.toLowerCase())
      .limit(1);

    if (emailError) {
      console.error('❌ Error finding customer by email:', emailError);
      return null;
    }

    if (customersByEmail && customersByEmail.length > 0) {
      const customer = customersByEmail[0];
      
      // If customer doesn't have auth_user_id but we have one, link them
      if (!customer.auth_user_id && authUserId) {
       
        const { error: updateError } = await supabase
          .from("store_customers")
          .update({
            auth_user_id: authUserId,
            updated_at: new Date().toISOString()
          })
          .eq("id", customer.id);

        if (updateError) {
          console.error('❌ Failed to link auth_user_id:', updateError);
        } else {
        }
      }

      return {
        id: customer.id,
        email: customer.email || email,
        name: customer.name || '',
        phone: customer.phone || null,
        auth_user_id: customer.auth_user_id || authUserId,
        profile: null,
      };
    }

    // No customer found - could create one if needed
    return null;

  } catch (error) {
    console.error('💥 Error in findOrCreateCustomer:', error);
    return null;
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
     
      
      refreshCustomerData();
      lastAuthUserIdRef.current = authUserId;
    }
  }, [authUserId]);

  // Add refresh listener
  useEffect(() => {
    const handleRefresh = () => {
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

      

      let resolvedCustomer: CurrentCustomer | null = null;
      
      // Determine which email to search with
      let searchEmail = null;
      if (formEmailRef.current) {
        searchEmail = formEmailRef.current.toLowerCase().trim();
      } else if (authEmail) {
        searchEmail = authEmail.toLowerCase().trim();
      }

      if (searchEmail) {
        // Use the findOrCreateCustomer helper
        resolvedCustomer = await findOrCreateCustomer(searchEmail, authUserId, storeSlug);
      }

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
  }, [authUserId, authLoading, justCreatedAccount, createdAccountEmail, isLoggedIn, authEmail, session, refreshTrigger, storeSlug]);

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