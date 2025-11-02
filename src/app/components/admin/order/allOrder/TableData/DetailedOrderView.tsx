"use client";

import React from "react";
import { StoreOrder } from "@/lib/types/order";
import StatusTag, { StatusType } from "../StatusFilter/StatusTag";
import { ClipboardCheck, CreditCard, Truck, DollarSign } from "lucide-react";

interface Props {
  order: StoreOrder;
}

const DetailedOrderView: React.FC<Props> = ({ order }) => {
  const address = order.shipping_address;
  const fullAddress = `${address.address_line_1}, ${address.city}, ${address.country}`;
  const isCancelled = order.status === "cancelled";

  const deliveryOption: StatusType = (order.delivery_option ||
    "courier") as StatusType;
  const paymentMethod: StatusType =
    order.payment_method === "cash"
      ? ("Cash on Delivery" as StatusType)
      : ("Online Payment" as StatusType);

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Order Summary */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Left Column: Customer Info */}
          <div className="space-y-4">
            <div className="p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                Customer
              </h4>
              <p className="text-base font-medium text-gray-800 dark:text-gray-100">
                {address.customer_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {order.customers?.email || "No email"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {address.phone}
              </p>
            </div>
            <div className="p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                Delivery Address
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {fullAddress}
              </p>
            </div>
          </div>

          {/* Right Column: Status Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
                <ClipboardCheck className="w-6 h-6 text-blue-500 mb-1 sm:mb-2" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Order Status
                </span>
                <StatusTag status={order.status as StatusType} size="small" />
              </div>

              <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
                <CreditCard className="w-6 h-6 text-green-500 mb-1 sm:mb-2" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Payment Status
                </span>
                <StatusTag
                  status={order.payment_status as StatusType}
                  size="small"
                />
              </div>

              {!isCancelled && (
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
                  <Truck className="w-6 h-6 text-orange-500 mb-1 sm:mb-2" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Delivery Method
                  </span>
                  <StatusTag status={deliveryOption} size="small" />
                </div>
              )}

              <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
                <DollarSign className="w-6 h-6 text-yellow-500 mb-1 sm:mb-2" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Payment Method
                </span>
                <StatusTag status={paymentMethod} size="small" />
              </div>
            </div>

            {/* Notes */}
            {order.notes && !isCancelled && (
              <div className="p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900 rounded-2xl border border-yellow-200 dark:border-yellow-700 text-sm text-gray-800 dark:text-yellow-200 shadow-sm">
                <strong>Order Notes:</strong> {order.notes}
              </div>
            )}

            {isCancelled && order.notes && (
              <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900 rounded-2xl border border-red-200 dark:border-red-700 text-sm text-red-700 dark:text-red-200 shadow-sm">
                <strong>Cancellation Note:</strong> {order.notes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedOrderView;
