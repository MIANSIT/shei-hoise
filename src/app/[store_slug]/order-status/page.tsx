"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { getCustomerOrders } from "@/lib/queries/orders/getCustomerOrders";
import { StoreOrder } from "@/lib/types/order";
// import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
import OrdersTable from "../../components/orders/CustomerOrderTable";
import { OrdersPageSkeleton } from "../../components/skeletons/OrdersPageSkeleton"; 
import { EmptyOrdersSkeleton } from "../../components/skeletons/EmptyOrdersSkeleton"; 
import { UserLoadingSkeleton } from "../../components/skeletons/UserLoadingSkeleton"; 

export default function OrdersPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use useMemo to get a stable user ID reference
  const userId = useMemo(() => user?.id, [user?.id]);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Only fetch if we have a user ID and we haven't fetched yet
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
  }, [userId, userLoading]); // Only depend on userId string, not the entire user object

  // Reset when user changes (logs out)
  useEffect(() => {
    if (!userId) {
      hasFetchedRef.current = false;
      setOrders([]);
      setLoading(true);
    }
  }, [userId]);

  if (userLoading) {
    return <UserLoadingSkeleton />;
  }

  if (!user) {
    return (
      <>
        {/* <Header /> */}
        <div className="flex items-center justify-center ">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">Please log in to view your orders.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* <Header /> */}
      
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">My Orders</h1>
            <p className="text-muted-foreground mt-2">View your order history and status</p>
          </div>

          {loading ? (
            <OrdersPageSkeleton />
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : orders.length === 0 ? (
            <EmptyOrdersSkeleton />
          ) : (
            <OrdersTable orders={orders} />
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}