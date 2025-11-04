"use client";

import React, { useState } from "react";
import { App } from "antd";
import { StoreOrder } from "@/lib/types/order";
import StatusTag, { StatusType } from "../StatusFilter/StatusTag";
import {
  ClipboardCheck,
  CreditCard,
  Truck,
  DollarSign,
  Copy,
  MapPin,
  Phone,
  User,
  Check,
} from "lucide-react";

interface Props {
  order: StoreOrder;
}

const DetailedOrderView: React.FC<Props> = ({ order }) => {
  const { message } = App.useApp();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const address = order.shipping_address;
  const fullAddress = `${address.address_line_1}, ${address.city}, ${address.country}`;
  const isCancelled = order.status === "cancelled";

  const deliveryOption: StatusType = (order.delivery_option ||
    "courier") as StatusType;
  const paymentMethod: StatusType =
    (order.payment_method as StatusType) || "cod";

  const copyToClipboard = (text: string, label: string, fieldId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(`${label} copied to clipboard!`);
      setCopiedField(fieldId);
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    });
  };

  const CopyIcon = ({ fieldId }: { fieldId: string }) => {
    if (copiedField === fieldId) {
      return <Check size={14} className="text-green-500" />;
    }
    return <Copy size={14} />;
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 rounded-md bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div>
          <strong className="text-sm sm:text-base">Order Number:</strong>
          <div className="font-mono text-sm sm:text-base">
            #{order.order_number}
          </div>
        </div>
        <div>
          <strong className="text-sm sm:text-base">Order Date:</strong>
          <div className="text-sm sm:text-base">
            {new Date(order.created_at).toLocaleDateString()}
          </div>
        </div>
        <div>
          <strong className="text-sm sm:text-base">Total Amount:</strong>
          <div className="font-semibold text-base sm:text-lg">
            ৳{order.total_amount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 shadow-md border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold mb-4 sm:mb-6 text-lg sm:text-xl text-gray-800 dark:text-gray-100">
          Order Items
        </h3>
        <div className="space-y-4">
          {order.order_items.map((item) => {
            const variant = item.variant_details;
            const basePrice = variant?.base_price ?? item.unit_price;
            const discountedPrice =
              variant?.discounted_price ?? item.discounted_price ?? basePrice;
            const total = discountedPrice * item.quantity;

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex flex-col">
                    <div className="font-medium text-gray-800 dark:text-gray-100 text-base sm:text-lg">
                      {item.product_name}
                    </div>
                    {variant && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Variant:{" "}
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {variant.variant_name}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-sm mt-1">
                      <span className="line-through text-gray-400">
                        ৳{basePrice.toFixed(2)}
                      </span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        ৳{discountedPrice.toFixed(2)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        × {item.quantity}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 sm:mt-0 font-semibold text-gray-900 dark:text-gray-100 text-right text-base sm:text-lg">
                  ৳{total.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold mb-2 sm:mb-3 text-base sm:text-lg">
          Pricing Breakdown
        </h3>
        <div className="space-y-2 sm:space-y-3">
          <div className="flex justify-between text-sm sm:text-base">
            <span>Subtotal:</span>
            <span>৳{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm sm:text-base">
            <span>Tax Amount:</span>
            <span>৳{order.tax_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm sm:text-base">
            <span>Shipping Fee:</span>
            <span>৳{order.shipping_fee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold text-sm sm:text-base">
            <span>Total Amount:</span>
            <span>৳{order.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Delivery & Payment Info */}
      <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold mb-3 text-base sm:text-lg">
          Delivery & Payment Information
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column: Customer Info */}
          <div className="space-y-4">
            <div className="p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-blue-500" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Customer Information
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-base font-medium text-gray-800 dark:text-gray-100 flex items-center justify-between">
                    {address.customer_name}
                    <button
                      onClick={() =>
                        copyToClipboard(
                          address.customer_name,
                          "Customer name",
                          "customer-name"
                        )
                      }
                      className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                    >
                      <CopyIcon fieldId="customer-name" />
                    </button>
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
                    {order.customers?.email || "No email"}
                    {order.customers?.email && (
                      <button
                        onClick={() =>
                          copyToClipboard(
                            order.customers!.email,
                            "Email",
                            "customer-email"
                          )
                        }
                        className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                      >
                        <CopyIcon fieldId="customer-email" />
                      </button>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      {address.phone}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          address.phone,
                          "Phone number",
                          "customer-phone"
                        )
                      }
                      className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                    >
                      <CopyIcon fieldId="customer-phone" />
                    </button>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-green-500" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Delivery Address
                </h4>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {address.address_line_1}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {address.city}, {address.country}
                </p>
                <button
                  onClick={() =>
                    copyToClipboard(fullAddress, "Full address", "full-address")
                  }
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors mt-2 cursor-pointer"
                >
                  {copiedField === "full-address" ? (
                    <Check size={12} className="text-green-500" />
                  ) : (
                    <Copy size={12} />
                  )}
                  {copiedField === "full-address"
                    ? "Copied!"
                    : "Copy Full Address"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Status Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
                <CreditCard className="w-6 h-6 text-green-500 mb-2" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 text-center">
                  Payment Status
                </span>
                <StatusTag
                  status={order.payment_status as StatusType}
                  size="small"
                />
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
                <DollarSign className="w-6 h-6 text-yellow-500 mb-2" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 text-center">
                  Payment Method
                </span>
                <StatusTag status={paymentMethod} size="small" />
              </div>
            </div>

            {/* Additional Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Summary */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  Order Summary
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items:</span>
                    <span>{order.order_items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Currency:</span>
                    <span>{order.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Status</span>

                    <StatusTag
                      status={order.status as StatusType}
                      size="small"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="text-xs">
                      {new Date(order.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              {!isCancelled && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    Delivery Info
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <StatusTag status={deliveryOption} size="small" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">City:</span>
                      <span>{address.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Country:</span>
                      <span>{address.country}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-3">
              {order.notes && !isCancelled && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-2xl border border-yellow-200 dark:border-yellow-700 text-sm text-gray-800 dark:text-yellow-200 shadow-sm">
                  <strong>Order Notes:</strong> {order.notes}
                </div>
              )}

              {isCancelled && order.notes && (
                <div className="p-4 bg-red-50 dark:bg-red-900 rounded-2xl border border-red-200 dark:border-red-700 text-sm text-red-700 dark:text-red-200 shadow-sm">
                  <strong>Cancellation Note:</strong> {order.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedOrderView;
