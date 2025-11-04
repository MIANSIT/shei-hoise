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
  Package,
  Calendar,
  FileText,
  Shield,
  BadgeCheck,
} from "lucide-react";

interface Props {
  order: StoreOrder;
}

const DetailedOrderView: React.FC<Props> = ({ order }) => {
  const { message } = App.useApp();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const address = order.shipping_address;
  const billingAddress = order.billing_address;
  const fullShippingAddress = `${address.address_line_1}, ${address.city}, ${address.country}`;
  const fullBillingAddress = billingAddress
    ? `${billingAddress.address_line_1}, ${billingAddress.city}, ${billingAddress.country}`
    : fullShippingAddress;

  const isCancelled = order.status === "cancelled";
  const isPaid = order.payment_status === "paid";

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
      return <Check size={12} className="text-green-500" />;
    }
    return <Copy size={12} />;
  };

  // Calculate savings if there are discounts
  const calculateSavings = () => {
    let totalSavings = 0;
    order.order_items.forEach((item) => {
      const variant = item.variant_details;
      const basePrice = variant?.base_price ?? item.unit_price;
      const discountedPrice =
        variant?.discounted_price ?? item.discounted_price ?? basePrice;
      if (discountedPrice < basePrice) {
        totalSavings += (basePrice - discountedPrice) * item.quantity;
      }
    });
    return totalSavings;
  };

  const totalSavings = calculateSavings();

  const calculateSubtotal = () => {
    let subtotal = 0;
    order.order_items.forEach((item) => {
      const variant = item.variant_details;
      const basePrice = variant?.base_price ?? item.unit_price;
      const discountedPrice =
        variant?.discounted_price ?? item.discounted_price ?? basePrice;
      const finalPrice =
        discountedPrice < basePrice ? discountedPrice : basePrice;
      subtotal += finalPrice * item.quantity;
    });
    return subtotal;
  };

  const calculatedSubtotal = calculateSubtotal();
  const totalQuantity = order.order_items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  return (
    <div className="space-y-3 sm:space-y-4 w-full">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold">Order #{order.order_number}</h1>
            <p className="text-blue-100 text-xs flex items-center gap-1 mt-1">
              <Calendar size={12} />
              Placed on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="mt-2 sm:mt-0 text-right">
            <div className="text-xl font-bold">
              ৳{order.total_amount.toFixed(2)}
            </div>
            <div className="text-blue-100 text-xs flex items-center justify-end gap-1 mt-1">
              <BadgeCheck size={12} />
              {isPaid ? "Payment Completed" : "Payment Pending"}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
              <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {order.order_items.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Items
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-purple-100 dark:bg-purple-900 rounded">
              <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {order.order_items.reduce(
                  (sum, item) => sum + item.quantity,
                  0
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Total Quantity
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-green-100 dark:bg-green-900 rounded">
              <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                ৳{calculatedSubtotal.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Subtotal
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-orange-100 dark:bg-orange-900 rounded">
              <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {order.shipping_fee === 0
                  ? "Free Shipping"
                  : `৳${order.shipping_fee.toFixed(2)}`}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Shipping
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Order Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Order Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
              <ClipboardCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                {order.status}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Order Status
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-green-100 dark:bg-green-900 rounded">
              <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div
                className={`text-sm font-bold capitalize ${
                  order.payment_status === "paid"
                    ? "text-green-600 dark:text-green-400"
                    : "text-yellow-600 dark:text-yellow-400"
                }`}
              >
                {order.payment_status}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Payment Status
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Method */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-orange-100 dark:bg-orange-900 rounded">
              <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                {order.delivery_option || "N/A"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Delivery Method
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-purple-100 dark:bg-purple-900 rounded">
              <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white uppercase">
                {order.payment_method}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Payment Method
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 shadow-md border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" />
            Order Items
          </h3>
          <div className="text-xs text-gray-500">
            {order.order_items.length} item
            {order.order_items.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="space-y-2">
          {order.order_items.map((item) => {
            const variant = item.variant_details;
            const basePrice = variant?.base_price ?? item.unit_price;
            const discountedPrice =
              variant?.discounted_price ?? item.discounted_price ?? basePrice;
            const total = discountedPrice * item.quantity;
            const hasDiscount = discountedPrice < basePrice;

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                      {item.product_name}
                    </div>

                    {variant && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {variant.variant_name}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
                      {hasDiscount && (
                        <span className="line-through text-gray-400">
                          ৳{basePrice.toFixed(2)}
                        </span>
                      )}
                      <span
                        className={`font-semibold ${
                          hasDiscount
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-800 dark:text-gray-100"
                        }`}
                      >
                        ৳{discountedPrice.toFixed(2)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        × {item.quantity}
                      </span>
                      {hasDiscount && (
                        <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-medium">
                          Save ৳
                          {(
                            (basePrice - discountedPrice) *
                            item.quantity
                          ).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2 sm:mt-0 font-semibold text-gray-900 dark:text-gray-100 text-right text-sm">
                  ৳{total.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>

        {totalSavings > 0 && (
          <div className="mt-3 p-2 bg-green-50 dark:bg-green-900 rounded-lg border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between text-green-800 dark:text-green-200 text-xs">
              <span className="font-semibold">Total Savings</span>
              <span className="font-bold">৳{totalSavings.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Financial Summary */}
      {/* Pricing Breakdown */}
      <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 shadow-md border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          Financial Summary
        </h3>

        <div className="space-y-2">
          {order.order_items.map((item) => {
            const basePrice =
              item.variant_details?.base_price ?? item.unit_price;
            const discountedPrice = item.unit_price;
            const hasDiscount = discountedPrice < basePrice;
            const subtotal = discountedPrice * item.quantity;

            return (
              <div
                key={item.id}
                className="p-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/30"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.product_name}
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    x{item.quantity}
                  </span>
                </div>

                <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                  Base Price: ৳{basePrice.toFixed(2)}
                </div>

                {hasDiscount && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Discounted Price: ৳{discountedPrice.toFixed(2)}
                  </div>
                )}
              </div>
            );
          })}

          <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2 space-y-2">
            {/* Subtotal (Before Discounts) */}
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Subtotal (Before Discounts)
              </span>
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                ৳{order.subtotal.toFixed(2)}
              </span>
            </div>

            {/* Discount (always show) */}
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Discount
              </span>
              <span
                className={`font-semibold text-sm ${
                  order.total_amount < order.subtotal
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-800 dark:text-gray-100"
                }`}
              >
                {order.total_amount < order.subtotal
                  ? `-৳${(order.subtotal - order.total_amount).toFixed(2)}`
                  : "৳0.00"}
              </span>
            </div>

            {/* Shipping Fee (always show) */}
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Shipping Fee
              </span>
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                ৳{order.shipping_fee ? order.shipping_fee.toFixed(2) : "0.00"}
              </span>
            </div>

            {/* Tax (always show) */}
            {order.tax_amount > 0 && (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Tax
                </span>
                <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                  ৳{order.tax_amount.toFixed(2)}
                </span>
              </div>
            )}
            {/* Total */}
            <div className="flex justify-between items-center pt-2 font-semibold border-t border-gray-200 dark:border-gray-600">
              <span className="text-sm">Total Amount</span>
              <span className="text-blue-600 dark:text-blue-400 text-sm">
                ৳{order.total_amount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 shadow-md border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500" />
          Address Information
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Shipping Address */}
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-green-500" />
              <h4 className="font-medium text-gray-700 dark:text-gray-200 text-sm">
                Shipping Address
              </h4>
            </div>

            <div className="space-y-2">
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm flex items-center justify-between">
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
                <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Phone size={12} />
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

              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                <p>{address.address_line_1}</p>
                <p>
                  {address.city}, {address.country}
                </p>
              </div>

              <button
                onClick={() =>
                  copyToClipboard(
                    fullShippingAddress,
                    "Shipping address",
                    "shipping-address"
                  )
                }
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors cursor-pointer mt-1"
              >
                {copiedField === "shipping-address" ? (
                  <Check size={10} className="text-green-500" />
                ) : (
                  <Copy size={10} />
                )}
                {copiedField === "shipping-address"
                  ? "Copied!"
                  : "Copy Address"}
              </button>
            </div>
          </div>

          {/* Billing Address */}
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-purple-500" />
              <h4 className="font-medium text-gray-700 dark:text-gray-200 text-sm">
                Billing Address
              </h4>
            </div>

            {billingAddress ? (
              <div className="space-y-2">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100 text-sm flex items-center justify-between">
                    {billingAddress.customer_name}
                    <button
                      onClick={() =>
                        copyToClipboard(
                          billingAddress.customer_name,
                          "Billing name",
                          "billing-name"
                        )
                      }
                      className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                    >
                      <CopyIcon fieldId="billing-name" />
                    </button>
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Phone size={12} />
                      {billingAddress.phone}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          billingAddress.phone,
                          "Billing phone",
                          "billing-phone"
                        )
                      }
                      className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                    >
                      <CopyIcon fieldId="billing-phone" />
                    </button>
                  </p>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                  <p>{billingAddress.address_line_1}</p>
                  <p>
                    {billingAddress.city}, {billingAddress.country}
                  </p>
                </div>

                <button
                  onClick={() =>
                    copyToClipboard(
                      fullBillingAddress,
                      "Billing address",
                      "billing-address"
                    )
                  }
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors cursor-pointer mt-1"
                >
                  {copiedField === "billing-address" ? (
                    <Check size={10} className="text-green-500" />
                  ) : (
                    <Copy size={10} />
                  )}
                  {copiedField === "billing-address"
                    ? "Copied!"
                    : "Copy Address"}
                </button>
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                Same as shipping address
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {order.notes && (
        <div
          className={`rounded-lg p-3 shadow-sm border ${
            isCancelled
              ? "bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700"
              : "bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText
              className={`w-4 h-4 ${
                isCancelled ? "text-red-500" : "text-yellow-500"
              }`}
            />
            <h3
              className={`font-medium text-sm ${
                isCancelled
                  ? "text-red-800 dark:text-red-200"
                  : "text-yellow-800 dark:text-yellow-200"
              }`}
            >
              {isCancelled ? "Cancellation Note" : "Order Notes"}
            </h3>
          </div>
          <p
            className={`text-xs ${
              isCancelled
                ? "text-red-700 dark:text-red-300"
                : "text-yellow-700 dark:text-yellow-300"
            }`}
          >
            {order.notes}
          </p>
        </div>
      )}
    </div>
  );
};

export default DetailedOrderView;
