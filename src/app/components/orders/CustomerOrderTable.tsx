// components/orders/CustomerOrderTable.tsx
"use client";

import { StoreOrder } from "../../../lib/types/order";
import { Copy, Check, ExternalLink, Receipt, DollarSign } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface OrdersTableProps {
  orders: StoreOrder[];
  onViewInvoice?: (order: StoreOrder) => void;
}

export default function OrdersTable({
  orders,
  onViewInvoice,
}: OrdersTableProps) {
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const {
    currency: storeCurrency,
    // icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();
  // Format currency
  const formatCurrency = (amount: number, orderCurrency?: string | null) => {
    if (currencyLoading) {
      return "Loading..";
    }
    const finalCurrency = orderCurrency || storeCurrency || "BDT";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: finalCurrency,
      minimumFractionDigits: 2,
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
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Order Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Payment Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Store
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {orders.map((order) => {
              const storeUrl = order.stores?.store_slug
                ? getStoreUrl(order.stores.store_slug)
                : null;

              return (
                <tr
                  key={order.id}
                  className="hover:bg-accent/50 transition-colors"
                >
                  {/* Order ID */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyOrderId(getDisplayOrderId(order))}
                        className="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer shrink-0"
                        title="Copy Order ID"
                      >
                        {copiedOrderId === getDisplayOrderId(order) ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {getDisplayOrderId(order)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-foreground">
                      {formatCurrency(order.total_amount || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Product Total: {formatCurrency(order.subtotal || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Shipping Fee: {formatCurrency(order.shipping_fee) || 0} |{" "}
                      <span className="uppercase">{order.delivery_option}</span>
                    </div>
                  </td>

                  {/* Order Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(
                        order.status,
                        "order"
                      )}`}
                    >
                      {order.status
                        ? order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)
                        : "Pending"}
                    </span>
                  </td>

                  {/* Payment Status */}
                  <td className="px-4 py-3">
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
                  </td>

                  {/* Store */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-foreground truncate">
                          {order.stores?.store_name || "Store"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          {order.stores?.store_slug ? (
                            <div className="flex items-center gap-1">
                              <Link
                                href={storeUrl!}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline flex items-center gap-1 transition-colors"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {order.stores.store_slug}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                              <button
                                onClick={async () => {
                                  const storeUrl = `${window.location.origin}/${order.stores.store_slug}`;
                                  try {
                                    await navigator.clipboard.writeText(
                                      storeUrl
                                    );
                                    setCopiedOrderId(storeUrl);
                                    setTimeout(
                                      () => setCopiedOrderId(null),
                                      2000
                                    );
                                  } catch (err) {
                                    console.error(
                                      "Failed to copy store URL:",
                                      err
                                    );
                                  }
                                }}
                                className="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer shrink-0"
                                title="Copy Store URL"
                              >
                                {copiedOrderId ===
                                `${window.location.origin}/${order.stores.store_slug}` ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Actions - Invoice Button */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onViewInvoice?.(order)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer"
                      title="View Invoice"
                    >
                      <Receipt className="h-4 w-4" />
                      Invoice
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No orders found
        </div>
      )}
    </div>
  );
}
