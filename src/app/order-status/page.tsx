"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { getCustomerOrders } from "@/lib/queries/orders/getCustomerOrders";
import { StoreOrder } from "@/lib/types/order";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import OrdersTable from "../components/orders/CustomerOrderTable";
import { OrdersPageSkeleton } from "../components/skeletons/OrdersPageSkeleton"; 
import { EmptyOrdersSkeleton } from "../components/skeletons/EmptyOrdersSkeleton"; 
import { UserLoadingSkeleton } from "../components/skeletons/UserLoadingSkeleton"; 


export default function OrdersPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const customerOrders = await getCustomerOrders(user.id);
        setOrders(customerOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  if (userLoading) {
    return <UserLoadingSkeleton />;
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-background">
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
      <Header />
      
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