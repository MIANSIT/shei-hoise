"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { getCustomerOrders } from "@/lib/queries/orders/getCustomerOrders";
import { StoreOrder } from "@/lib/types/order";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import OrdersTable from "../components/orders/CustomerOrderTable";
import { OrdersPageSkeleton } from "../components/skeletons/OrdersPageSkeleton"; // Add this
import { EmptyOrdersSkeleton } from "../components/skeletons/EmptyOrdersSkeleton"; // Add this
import { UserLoadingSkeleton } from "../components/skeletons/UserLoadingSkeleton"; // Add this

// Simple loader component matching your theme
const SimpleLoader = ({ loadingText }: { loadingText?: string }) => {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="h-6 w-6 border-3 border-primary border-r-transparent rounded-full animate-spin" 
           style={{ animationDuration: "0.75s" }} />
      {loadingText && (
        <span className="text-primary text-sm font-medium">{loadingText}</span>
      )}
    </div>
  );
};

export default function OrdersPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const store_slug = params.store_slug as string;

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

  // ✅ REPLACED: Using custom skeleton for user loading
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

          {/* ✅ REPLACED: Using custom skeletons */}
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