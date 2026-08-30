"use client";

import React, { useState } from "react";
import { App } from "antd";
import { StoreOrder } from "@/lib/types/order";
import {
  ClipboardCheck,
  CreditCard,
  Truck,
  DollarSign,
  Copy,
  MapPin,
  Phone,
  Check,
  Package,
  Calendar,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { createReviewInviteLink } from "@/lib/queries/reviews/createReviewInviteLink";

interface Props {
  order: StoreOrder;
}

const DetailedOrderView: React.FC<Props> = ({ order }) => {
  const { message } = App.useApp();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [generatingReviewLink, setGeneratingReviewLink] = useState<string | null>(null);
  const { icon: currencyIcon, loading: currencyLoading } =
    useUserCurrencyIcon();

  const address = order.shipping_address;
  const billingAddress = order.billing_address;
  const fullShippingAddress = `${address.address_line_1}, ${address.city}, ${address.country}`;
  const fullBillingAddress = billingAddress
    ? `${billingAddress.address_line_1}, ${billingAddress.city}, ${billingAddress.country}`
    : fullShippingAddress;

  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const isPaid = order.payment_status === "paid";

  const copyToClipboard = (text: string, label: string, fieldId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(`${label} copied to clipboard!`);
      setCopiedField(fieldId);
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    });
  };

  const handleGetReviewLink = async (itemId: string, productId: string) => {
    setGeneratingReviewLink(itemId);
    try {
      const result = await createReviewInviteLink(order.id, productId);
      if (!result.success) {
        message.error(result.error);
        return;
      }
      copyToClipboard(result.url, "Review link", `review-${itemId}`);
    } catch (err) {
      console.error(err);
      message.error("Failed to create review link");
    } finally {
      setGeneratingReviewLink(null);
    }
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
  const displayCurrencyIcon = currencyLoading ? null : (currencyIcon ?? null);
  const displayCurrencyIconSafe = displayCurrencyIcon || "৳";

  return (
    <div className="space-y-3 sm:space-y-4 w-full">
      {/* Premium Header */}
      {/* Premium Header */}
      <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  copyToClipboard(
                    order.order_number,
                    "Order number",
                    "order-number",
                  )
                }
                className="flex items-center gap-2 hover:bg-blue-700/30 px-2 py-1 rounded transition-colors cursor-pointer group"
              >
                <h1 className="text-lg font-bold">
                  Order #{order.order_number}
                </h1>
                {copiedField === "order-number" ? (
                  <Check size={16} className="text-green-300" />
                ) : (
                  <Copy
                    size={16}
                    className="text-blue-200 group-hover:text-white"
                  />
                )}
              </button>
            </div>
            <p className="text-blue-100 text-xs flex items-center gap-1 mt-1">
              <Calendar size={12} />
              Placed on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="mt-2 sm:mt-0 text-right">
            <div className="text-xl font-bold">
              {displayCurrencyIconSafe}
              {order.total_amount.toFixed(2)}
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
        <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
              <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                {order.order_items.length}
              </div>
              <div className="text-xs text-muted-foreground">
                Items
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-purple-100 dark:bg-purple-900 rounded">
              <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                {order.order_items.reduce(
                  (sum, item) => sum + item.quantity,
                  0,
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Total Quantity
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-green-100 dark:bg-green-900 rounded">
              <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                {displayCurrencyIconSafe}
                {calculatedSubtotal.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                Subtotal
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-orange-100 dark:bg-orange-900 rounded">
              <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                {order.shipping_fee === 0
                  ? "Free Shipping"
                  : ` ${displayCurrencyIconSafe}${order.shipping_fee.toFixed(
                      2,
                    )}`}
              </div>
              <div className="text-xs text-muted-foreground">
                Shipping
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Order Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Order Status */}
        <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
              <ClipboardCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground capitalize">
                {order.status}
              </div>
              <div className="text-xs text-muted-foreground">
                Order Status
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
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
              <div className="text-xs text-muted-foreground">
                Payment Status
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Method */}
        <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-orange-100 dark:bg-orange-900 rounded">
              <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground capitalize">
                {order.delivery_option || "N/A"}
              </div>
              <div className="text-xs text-muted-foreground">
                Delivery Method
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-purple-100 dark:bg-purple-900 rounded">
              <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground uppercase">
                {order.payment_method}
              </div>
              <div className="text-xs text-muted-foreground">
                Payment Method
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl bg-linear-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 shadow-md border border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
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

            // Get SKUs from the item - using optional chaining since these are optional properties
            const productSku = item.product_sku || "";
            const variantSku = item.variant_sku || "";
            const displaySku = variantSku || productSku;

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between bg-card rounded-lg p-3 shadow-sm border border-border"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex-1">
                    {/* Product Name and SKU */}
                    <div className="flex flex-col gap-1">
                      <div className="font-medium text-foreground text-sm">
                        {item.product_name}
                      </div>

                      {/* Display SKU if available */}
                      {displaySku && (
                        <div className="text-xs text-muted-foreground">
                          SKU:{" "}
                          <span className="font-medium text-foreground">
                            {displaySku}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Variant Information */}
                    {variant && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">
                          {variant.variant_name}
                          {/* Show variant SKU if it's different from product SKU */}
                          {variantSku &&
                            productSku &&
                            variantSku !== productSku && (
                              <span className="ml-2 text-gray-500">
                                ({variantSku})
                              </span>
                            )}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
                      {hasDiscount && (
                        <span className="line-through text-gray-400">
                          {displayCurrencyIconSafe}
                          {basePrice.toFixed(2)}
                        </span>
                      )}
                      <span
                        className={`font-semibold ${
                          hasDiscount
                            ? "text-green-600 dark:text-green-400"
                            : "text-foreground"
                        }`}
                      >
                        {displayCurrencyIconSafe}
                        {discountedPrice.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        × {item.quantity}
                      </span>
                      {hasDiscount && (
                        <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-medium">
                          Save {displayCurrencyIconSafe}
                          {(
                            (basePrice - discountedPrice) *
                            item.quantity
                          ).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2 sm:mt-0 flex flex-col items-end gap-1.5">
                  <div className="font-semibold text-foreground text-right text-sm">
                    {displayCurrencyIconSafe}
                    {total.toFixed(2)}
                  </div>
                  {isDelivered && (
                    <button
                      onClick={() => handleGetReviewLink(item.id, item.product_id)}
                      disabled={generatingReviewLink === item.id}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
                    >
                      <CopyIcon fieldId={`review-${item.id}`} />
                      {generatingReviewLink === item.id
                        ? "Generating…"
                        : "Get review link"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalSavings > 0 && (
          <div className="mt-3 p-2 bg-green-50 dark:bg-green-900 rounded-lg border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between text-green-800 dark:text-green-200 text-xs">
              <span className="font-semibold">Total Savings</span>
              <span className="font-bold">
                {" "}
                {displayCurrencyIconSafe}
                {totalSavings.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="rounded-xl bg-linear-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 shadow-md border border-border">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          Financial Summary
        </h3>

        <div className="space-y-2">
          {order.order_items.map((item) => {
            const basePrice =
              item.variant_details?.base_price ?? item.unit_price;
            const discountedPrice = item.unit_price;
            const hasDiscount = discountedPrice < basePrice;
            // Get SKU for display in financial summary
            const productSku = item.product_sku || "";
            const variantSku = item.variant_sku || "";
            const displaySku = variantSku || productSku;

            return (
              <div
                key={item.id}
                className="p-2 rounded-lg border border-border bg-white/50 dark:bg-gray-800/30"
              >
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {item.product_name}
                    </span>
                    {displaySku && (
                      <span className="text-xs text-muted-foreground">
                        SKU: {displaySku}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    x{item.quantity}
                  </span>
                </div>

                <div className="text-xs mt-1 text-muted-foreground">
                  Base Price: {displayCurrencyIconSafe}
                  {basePrice.toFixed(2)}
                </div>

                {hasDiscount && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Discounted Price: {displayCurrencyIconSafe}
                    {discountedPrice.toFixed(2)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Summary Details */}
      <div className="rounded-xl bg-linear-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 shadow-md border border-border">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          Order Summary
        </h3>

        <div className="space-y-2">
          {/* Subtotal */}
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-muted-foreground">
              Subtotal
            </span>
            <span className="font-semibold text-sm text-foreground">
              {displayCurrencyIconSafe}
              {order.subtotal.toFixed(2)}
            </span>
          </div>

          {/* Discount */}
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-muted-foreground">
              Discount
            </span>
            <span className="font-semibold text-sm text-green-600 dark:text-green-400">
              -{displayCurrencyIconSafe}
              {(order.discount_amount || 0).toFixed(2)}
            </span>
          </div>

          {/* Shipping Fee */}
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-muted-foreground">
              Shipping Fee
            </span>
            <span className="font-semibold text-sm text-foreground">
              {displayCurrencyIconSafe}
              {(order.shipping_fee || 0).toFixed(2)}
            </span>
          </div>

          {/* Tax */}
          {(order.tax_amount ?? 0) > 0 && (
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground">
                Tax
              </span>
              <span className="font-semibold text-sm text-foreground">
                {displayCurrencyIconSafe}
                {(order.tax_amount || 0).toFixed(2)}
              </span>
            </div>
          )}
          {(order.additional_charges ?? 0) > 0 && (
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-muted-foreground">
                Additional Charges
              </span>
              <span className="font-semibold text-sm text-foreground">
                {displayCurrencyIconSafe}
                {(order.additional_charges ?? 0).toFixed(2)}
              </span>
            </div>
          )}

          {/* Total Amount */}
          <div className="flex justify-between items-center pt-2 font-semibold border-t border-border">
            <span className="text-sm">Total Amount</span>
            <span className="text-blue-600 dark:text-blue-400 text-sm">
              {displayCurrencyIconSafe}
              {order.total_amount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="rounded-xl bg-linear-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 shadow-md border border-border">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500" />
          Address Information
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Shipping Address */}
          <div className="p-3 bg-card rounded-lg shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-green-500" />
              <h4 className="font-medium text-foreground text-sm">
                Shipping Address
              </h4>
            </div>

            <div className="space-y-2">
              <div>
                <p className="font-medium text-foreground text-sm flex items-center justify-between">
                  {address.customer_name}
                  <button
                    onClick={() =>
                      copyToClipboard(
                        address.customer_name,
                        "Customer name",
                        "customer-name",
                      )
                    }
                    className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                  >
                    <CopyIcon fieldId="customer-name" />
                  </button>
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Phone size={12} />
                    {address.phone}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        address.phone,
                        "Phone number",
                        "customer-phone",
                      )
                    }
                    className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                  >
                    <CopyIcon fieldId="customer-phone" />
                  </button>
                </p>
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5">
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
                    "shipping-address",
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
          <div className="p-3 bg-card rounded-lg shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-purple-500" />
              <h4 className="font-medium text-foreground text-sm">
                Billing Address
              </h4>
            </div>

            {billingAddress ? (
              <div className="space-y-2">
                <div>
                  <p className="font-medium text-foreground text-sm flex items-center justify-between">
                    {billingAddress.customer_name}
                    <button
                      onClick={() =>
                        copyToClipboard(
                          billingAddress.customer_name,
                          "Billing name",
                          "billing-name",
                        )
                      }
                      className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                    >
                      <CopyIcon fieldId="billing-name" />
                    </button>
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Phone size={12} />
                      {billingAddress.phone}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          billingAddress.phone,
                          "Billing phone",
                          "billing-phone",
                        )
                      }
                      className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                    >
                      <CopyIcon fieldId="billing-phone" />
                    </button>
                  </p>
                </div>

                <div className="text-xs text-muted-foreground space-y-0.5">
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
                      "billing-address",
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
              <div className="text-xs text-muted-foreground italic">
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
