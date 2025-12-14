// app/[store_slug]/order-status/page.tsx - OPTIMIZED VERSION
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useCurrentCustomer } from "@/lib/hook/useCurrentCustomer";
import { getCustomerOrders } from "@/lib/queries/orders/getCustomerOrders";
import { StoreOrder } from "@/lib/types/order";
import Footer from "../../components/common/Footer";
import OrdersTable from "../../components/orders/CustomerOrderTable";
import OrdersCard from "../../components/orders/CustomerOrderCard";
import { OrdersPageSkeleton } from "../../components/skeletons/OrdersPageSkeleton"; 
import { EmptyOrdersSkeleton } from "../../components/skeletons/EmptyOrdersSkeleton"; 
import { UserLoadingSkeleton } from "../../components/skeletons/UserLoadingSkeleton"; 
import { AnimatePresence } from "framer-motion";
import AnimatedInvoice from "../../components/invoice/AnimatedInvoice";
import { useParams } from "next/navigation";
import { OrderAuthPrompt } from "../../components/auth/OrderAuthPrompt";
import { Button } from "@/components/ui/button";
import { useCheckoutStore } from "@/lib/store/userInformationStore";

export default function StoreOrdersPage() {
  const params = useParams();
  const storeSlug = params.store_slug as string;
  
  const { 
    customer, 
    loading: customerLoading, 
    error: customerError,
    hasAuthUserId,
    isLoggedIn,
    authEmail,
  } = useCurrentCustomer(storeSlug);
  
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const { justCreatedAccount, createdAccountEmail, clearAccountCreationFlags } = useCheckoutStore();
  const isFetchingOrdersRef = useRef(false);
  const mountedRef = useRef(true);
  
  // ✅ Memoized values to prevent unnecessary recalculations
  const isNewlyCreatedAccount = useMemo(() => 
    Boolean(justCreatedAccount && createdAccountEmail && createdAccountEmail === customer?.email),
    [justCreatedAccount, createdAccountEmail, customer?.email]
  );

  const shouldForceShowOrders = useMemo(() => 
    isNewlyCreatedAccount && customer?.auth_user_id,
    [isNewlyCreatedAccount, customer?.auth_user_id]
  );

  // ✅ Memoized fetch orders function
  const fetchOrders = useCallback(async () => {
    if (!customer?.id || isFetchingOrdersRef.current || !mountedRef.current) {
      return;
    }

    // Allow fetching orders if:
    // 1. User is logged in AND has auth_user_id, OR
    // 2. User just created account during checkout (even if not fully logged in yet)
    const shouldFetchOrders = (isLoggedIn && hasAuthUserId) || shouldForceShowOrders;
    
    console.log('🔄 Should fetch orders?', {
      shouldFetchOrders,
      isLoggedIn,
      hasAuthUserId,
      shouldForceShowOrders,
      customerId: customer?.id,
    });

    if (!shouldFetchOrders) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    try {
      isFetchingOrdersRef.current = true;
      setLoadingOrders(true);
      setError(null);
      console.log('🔄 Fetching orders for customer:', customer.id);
      
      const customerOrders = await getCustomerOrders(customer.id);
      
      if (mountedRef.current) {
        setOrders(customerOrders);
        
        // If this was a newly created account, clear the flags after fetching orders
        if (shouldForceShowOrders) {
          console.log('🧹 Clearing account creation flags after fetching orders');
          setTimeout(() => {
            clearAccountCreationFlags();
          }, 1000);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      }
    } finally {
      if (mountedRef.current) {
        setLoadingOrders(false);
        isFetchingOrdersRef.current = false;
      }
    }
  }, [customer?.id, isLoggedIn, hasAuthUserId, shouldForceShowOrders, clearAccountCreationFlags]);

  // ✅ Optimized effect for fetching orders
  useEffect(() => {
    mountedRef.current = true;
    
    // Only fetch if customer is loaded and not already fetching
    if (!customerLoading && customer && !isFetchingOrdersRef.current) {
      fetchOrders();
    } else if (!customerLoading && !customer) {
      setOrders([]);
      setLoadingOrders(false);
    }

    return () => {
      mountedRef.current = false;
      isFetchingOrdersRef.current = false;
    };
  }, [customer, customerLoading, fetchOrders]);

  const handleViewInvoice = useCallback((order: StoreOrder) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  }, []);

  // ✅ Memoized decision logic
  const isEmailMismatch = useMemo(() => 
    isLoggedIn && authEmail && customer?.email && authEmail !== customer.email,
    [isLoggedIn, authEmail, customer?.email]
  );

  // Show loading while checking customer
  if (customerLoading) {
    return <UserLoadingSkeleton />;
  }

  // Show error if customer fetch failed
  if (customerError) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-destructive mb-4">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load Customer Data</h3>
          <p className="text-muted-foreground mb-4">Please try again or contact support.</p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // DECISION TREE (in order of priority):
  
  // 1. Email mismatch - logged in with different email
  if (isEmailMismatch) {
    console.log('📢 Showing email mismatch prompt');
    return (
      <OrderAuthPrompt 
        storeSlug={storeSlug}
        customerEmail={customer?.email}
        hasAuthUserId={hasAuthUserId}
        isLoggedIn={isLoggedIn}
        authEmail={authEmail}
        title="Account Mismatch"
        description={`You're logged in as ${authEmail} but your orders are under ${customer?.email}`}
      />
    );
  }
  
  // 2. Has account but not logged in
  if (!isLoggedIn && hasAuthUserId && customer && !shouldForceShowOrders) {
    console.log('📢 Showing sign in prompt (has account but not logged in)');
    return (
      <OrderAuthPrompt 
        storeSlug={storeSlug}
        customerEmail={customer.email}
        hasAuthUserId={hasAuthUserId}
        isLoggedIn={isLoggedIn}
        authEmail={authEmail}
        title="Sign In Required"
        description={`You have an account with ${customer.email}. Please sign in to view your orders.`}
      />
    );
  }
  
  // 3. Guest checkout - no auth_user_id
  if (!isLoggedIn && !hasAuthUserId && customer) {
    console.log('📢 Showing complete account prompt (guest checkout)');
    return (
      <OrderAuthPrompt 
        storeSlug={storeSlug}
        customerEmail={customer.email}
        hasAuthUserId={hasAuthUserId}
        isLoggedIn={isLoggedIn}
        authEmail={authEmail}
        title="Complete Your Account"
        description={`You ordered as ${customer.email}. Create a password to complete your account and view orders.`}
      />
    );
  }
  
  // 4. No customer found at all
  if (!customer) {
    console.log('📢 Showing new account prompt (no customer found)');
    return (
      <OrderAuthPrompt 
        storeSlug={storeSlug}
        customerEmail={undefined}
        hasAuthUserId={false}
        isLoggedIn={isLoggedIn}
        authEmail={authEmail}
        title="Access Your Orders"
        description="Sign in or create an account to view your order history"
      />
    );
  }
  
  // 5. Logged in with matching email and has auth_user_id - SHOW ORDERS
  console.log('📢 Showing orders (logged in with matching email)');

  return (
    <>
      <div className="min-h-screen bg-background text-foreground py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            {isLoggedIn && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-blue-700 text-sm">
                      Signed in as <strong>{authEmail}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">My Orders</h1>
                <p className="text-muted-foreground mt-2">
                  View your order history and track current orders
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Store</p>
                <p className="text-sm font-medium">{storeSlug}</p>
              </div>
            </div>
          </div>

          {loadingOrders ? (
            <OrdersPageSkeleton />
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
              <div className="text-destructive mb-2">
                <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-destructive mb-1">Unable to Load Orders</h3>
              <p className="text-destructive/80 text-sm">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <EmptyOrdersSkeleton />
          ) : (
            <>
              {/* Order Summary */}
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      Order Summary
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {orders.length} order{orders.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="text-sm font-medium">
                      {customer?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <OrdersTable orders={orders} onViewInvoice={handleViewInvoice} />
              </div>
              
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                <OrdersCard orders={orders} onViewInvoice={handleViewInvoice} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      <AnimatePresence>
        {showInvoice && selectedOrder && (
          <AnimatedInvoice
            isOpen={showInvoice}
            onClose={() => setShowInvoice(false)}
            orderData={selectedOrder}
            showCloseButton={true}
            autoShow={false}
          />
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
}