// app/[store_slug]/order-status/page.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
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
import { useCheckoutStore } from "@/lib/store/userInformationStore"; // ✅ ADD THIS IMPORT

export default function StoreOrdersPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const params = useParams();
  const storeSlug = params.store_slug as string;
  
  // ✅ ADD THIS: Initialize the store to ensure data is loaded
  const { setStoreSlug } = useCheckoutStore();
  
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  
  // Use useMemo to get a stable user ID reference
  const userId = useMemo(() => user?.id, [user?.id]);
  const hasFetchedRef = useRef(false);

  // ✅ Store the current store slug when page loads
  useEffect(() => {
    if (storeSlug) {
      setStoreSlug(storeSlug);
    }
  }, [storeSlug, setStoreSlug]);

  // ✅ Fetch orders only if user is logged in
  useEffect(() => {
    if (!userId || userLoading) return;

    if (!hasFetchedRef.current) {
      const fetchOrders = async () => {
        try {
          setLoading(true);
          setError(null);
          const customerOrders = await getCustomerOrders(userId);
          setOrders(customerOrders);
          hasFetchedRef.current = true;
        } catch (err) {
          console.error('Error fetching orders:', err);
          setError('Failed to load orders. Please try again.');
        } finally {
          setLoading(false);
        }
      };

      fetchOrders();
    }
  }, [userId, userLoading]);

  // Reset when user changes (logs out)
  useEffect(() => {
    if (!userId) {
      hasFetchedRef.current = false;
      setOrders([]);
      setLoading(true);
    }
  }, [userId]);

  const handleViewInvoice = (order: StoreOrder) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  // Show loading while checking auth
  if (userLoading) {
    return <UserLoadingSkeleton />;
  }

  // ✅ If user is NOT logged in, show the authentication prompt
  if (!user) {
    return (
      <OrderAuthPrompt 
        storeSlug={storeSlug}
        title="Access Your Orders"
        description="Sign in to view your order history, track shipments, and manage your purchases"
      />
    );
  }

  // ✅ User IS logged in - show their orders
  return (
    <>
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">My Orders</h1>
                <p className="text-muted-foreground mt-2">
                  View your order history and track current orders
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Store</p>
                <p className="text-sm font-medium text-foreground">{storeSlug}</p>
              </div>
            </div>
          </div>

          {loading ? (
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
                    <h3 className="font-semibold text-foreground">
                      Order Summary
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {orders.length} order{orders.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Last order</p>
                    <p className="text-sm font-medium text-foreground">
                      {orders.length > 0 ? new Date(orders[0].created_at).toLocaleDateString() : 'N/A'}
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