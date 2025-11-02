"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { getCustomerOrders } from "@/lib/queries/orders/getCustomerOrders";
import { StoreOrder } from "@/lib/types/order";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import OrdersTable from "../components/orders/CustomerOrderTable";

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

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <SimpleLoader loadingText="Loading user information..." />
      </div>
    );
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
            <div className="flex justify-center py-12">
              <SimpleLoader loadingText="Loading your orders..." />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg 
                    className="w-8 h-8 text-muted-foreground" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" 
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-4">You haven&apos;t placed any orders with this store.</p>
                <a
                  href={`/${store_slug}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
                >
                  Start Shopping
                </a>
              </div>
            </div>
          ) : (
            <OrdersTable orders={orders} />
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}