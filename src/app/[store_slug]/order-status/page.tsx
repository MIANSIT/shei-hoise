// app/[store_slug]/order-status/page.tsx - UPDATED FOR GLOBAL ORDERS
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Package } from "lucide-react";

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
  
  // Memoized values
  const isNewlyCreatedAccount = useMemo(() => 
    Boolean(justCreatedAccount && createdAccountEmail && createdAccountEmail === customer?.email),
    [justCreatedAccount, createdAccountEmail, customer?.email]
  );

  const shouldForceShowOrders = useMemo(() => 
    isNewlyCreatedAccount && customer?.auth_user_id,
    [isNewlyCreatedAccount, customer?.auth_user_id]
  );

  // Group orders by store
  const ordersByStore = useMemo(() => {
    const grouped: { [storeSlug: string]: StoreOrder[] } = {};
    
    orders.forEach(order => {
      const storeSlug = order.stores?.store_slug || 'unknown';
      if (!grouped[storeSlug]) {
        grouped[storeSlug] = [];
      }
      grouped[storeSlug].push(order);
    });
    
    return grouped;
  }, [orders]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalStores = Object.keys(ordersByStore).length;
    const totalAmount = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    
    return { totalOrders, totalStores, totalAmount };
  }, [orders, ordersByStore]);

  // Fetch all orders globally
  const fetchOrders = useCallback(async () => {
    if (!customer?.id || isFetchingOrdersRef.current || !mountedRef.current) {
      return;
    }

    // Allow fetching orders if:
    // 1. User is logged in AND has auth_user_id, OR
    // 2. User just created account during checkout (even if not fully logged in yet)
    const shouldFetchOrders = (isLoggedIn && hasAuthUserId) || shouldForceShowOrders;
    
    console.log('🔄 Should fetch global orders?', {
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
      console.log('🔄 Fetching ALL orders for customer globally:', customer.id);
      
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
        console.error('Error fetching global orders:', err);
        setError('Failed to load orders. Please try again.');
      }
    } finally {
      if (mountedRef.current) {
        setLoadingOrders(false);
        isFetchingOrdersRef.current = false;
      }
    }
  }, [customer?.id, isLoggedIn, hasAuthUserId, shouldForceShowOrders, clearAccountCreationFlags]);

  // Optimized effect for fetching orders
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

  // Memoized decision logic
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
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-destructive">Error</CardTitle>
            <CardDescription>
              Unable to load customer data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // DECISION TREE (in order of priority):
  
  // 1. Email mismatch - logged in with different email
  if (isEmailMismatch) {
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
  
  // 5. Logged in with matching email and has auth_user_id - SHOW ALL ORDERS

  return (
    <>
      <div className="min-h-screen bg-background text-foreground py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            {/* {isLoggedIn && (
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
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
                      <p className="text-blue-600 text-xs mt-1">
                        Viewing all your orders across all stores
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )} */}
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">My Orders</h1>
                <p className="text-muted-foreground mt-2">
                  View all your orders across all stores
                </p>
              </div>
            </div>

            {/* Statistics */}
            {/* {orders.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Orders</p>
                        <p className="text-2xl font-bold">{stats.totalOrders}</p>
                      </div>
                      <Package className="h-8 w-8 text-primary opacity-70" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Stores</p>
                        <p className="text-2xl font-bold">{stats.totalStores}</p>
                      </div>
                      <Store className="h-8 w-8 text-green-500 opacity-70" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Spent</p>
                        <p className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</p>
                      </div>
                      <Badge variant="outline" className="text-lg">
                        ALL
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )} */}

            {/* Group orders by store */}
            {Object.keys(ordersByStore).length > 0 && (
              <div className="space-y-8">
                {Object.entries(ordersByStore).map(([storeSlug, storeOrders]) => (
                  <div key={storeSlug} className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <Store className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-xl font-semibold capitalize">
                        {storeOrders[0].stores?.store_name || storeSlug}
                      </h2>
                      <Badge variant="secondary">
                        {storeOrders.length} order{storeOrders.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    {/* Desktop Table View */}
                    <div className="hidden lg:block">
                      <OrdersTable orders={storeOrders} onViewInvoice={handleViewInvoice} />
                    </div>
                    
                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-4">
                      <OrdersCard orders={storeOrders} onViewInvoice={handleViewInvoice} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {loadingOrders ? (
            <OrdersPageSkeleton />
          ) : error ? (
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="text-destructive mb-4">
                    <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              </CardContent>
            </Card>
          ) : orders.length === 0 ? (
            <EmptyOrdersSkeleton />
          ) : null}
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