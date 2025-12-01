// components/orders/CustomerOrderCard.tsx
"use client";

import { StoreOrder } from "../../../lib/types/order";
import { Copy, Check, ExternalLink, Calendar, DollarSign, Package, Receipt } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface OrdersCardProps {
  orders: StoreOrder[];
  onViewInvoice?: (order: StoreOrder) => void;
}

export default function OrdersCard({ orders, onViewInvoice }: OrdersCardProps) {
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Reusable badge color function for order & payment
  const getBadgeColor = (
    status: string,
    type: "order" | "payment" = "order"
  ) => {
    const s = status?.toLowerCase();

    if (type === "order") {
      switch (s) {
        case "delivered":
        case "delivered":
          return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
        case "pending":
          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
        case "processing":
        case "confirmed":
          return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
        case "cancelled":
          return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
        case "shipped":
          return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      }
    } else if (type === "payment") {
      switch (s) {
        case "paid":
          return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
        case "pending":
          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
        case "failed":
          return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      }
    }

    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  // Copy order ID to clipboard
  const copyOrderId = async (orderId: string) => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopiedOrderId(orderId);
      setTimeout(() => setCopiedOrderId(null), 2000);
    } catch (err) {
      console.error("Failed to copy order ID:", err);
    }
  };

  // Get display order ID
  const getDisplayOrderId = (order: StoreOrder) => {
    return order.order_number || `#${order.id.slice(-8)}`;
  };

  // Get store URL
  const getStoreUrl = (storeSlug: string) => {
    return `/${storeSlug}`;
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const storeUrl = order.stores?.store_slug
          ? getStoreUrl(order.stores.store_slug)
          : null;

        return (
          <div
            key={order.id}
            className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
          >
            {/* Order Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyOrderId(getDisplayOrderId(order))}
                  className="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer flex-shrink-0"
                  title="Copy Order ID"
                >
                  {copiedOrderId === getDisplayOrderId(order) ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <div>
                  <div className="text-base font-semibold text-foreground">
                    {getDisplayOrderId(order)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(order.created_at)}
                  </div>
                </div>
              </div>
              
              {/* Store Link */}
              {storeUrl && (
                <Link
                  href={storeUrl}
                  className="p-2 rounded-md hover:bg-accent transition-colors flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Visit Store"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}
            </div>

            {/* Order Details */}
            <div className="space-y-3">
              {/* Total Amount */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Total</span>
                </div>
                <div className="text-sm font-medium text-foreground">
                  {formatCurrency(order.total_amount || 0)}
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(
                      order.status,
                      "order"
                    )}`}
                  >
                    <Package className="h-3 w-3 mr-1" />
                    {order.status
                      ? order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)
                      : "Pending"}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(
                      order.payment_status,
                      "payment"
                    )}`}
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    {order.payment_status
                      ? order.payment_status.charAt(0).toUpperCase() +
                        order.payment_status.slice(1)
                      : "Pending"}
                  </span>
                </div>
                
                {/* Store Name */}
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Store</div>
                  <div className="text-sm font-medium text-foreground truncate max-w-[120px]">
                    {order.stores?.store_name || "Store"}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  Shipping: {formatCurrency(order.shipping_fee) || 0} •{" "}
                  <span className="uppercase">{order.delivery_option}</span>
                </div>
              </div>

              {/* Invoice Button */}
              <div className="pt-2">
                <button
                  onClick={() => onViewInvoice?.(order)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors cursor-pointer"
                >
                  <Receipt className="h-4 w-4" />
                  View Invoice
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {orders.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No orders found
        </div>
      )}
    </div>
  );
}