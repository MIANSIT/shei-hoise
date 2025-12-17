"use client";

import React, { useState } from "react";
import { App } from "antd";
import { StoreOrder } from "@/lib/types/order";
import StatusTag, { StatusType } from "../StatusFilter/StatusTag";
import {
  Copy,
  Check,
  Truck,
  DollarSign,
  Package,
  Calendar,
  FileText,
  // MapPin,
  // Phone,
  User,
  BadgeCheck,
  Shield,
} from "lucide-react";

import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";


interface Props {
  order: StoreOrder;
  selected?: boolean;
  onSelect?: (orderId: string, selected: boolean) => void;
}

const MobileDetailedViewFull: React.FC<Props> = ({
  order,
  selected = false,
  onSelect,
}) => {
  const { message } = App.useApp();
  const [copiedField, setCopiedField] = useState<string | null>(null);
 const {
    // currency,
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();
  const address = order.shipping_address;
  const billingAddress = order.billing_address || address;
  const fullShippingAddress = `${address.address_line_1}, ${address.city}, ${address.country}`;
  const fullBillingAddress = `${billingAddress.address_line_1}, ${billingAddress.city}, ${billingAddress.country}`;
  // const isCancelled = order.status === "cancelled";
  const isPaid = order.payment_status === "paid";

  const deliveryOption: StatusType = (order.delivery_option ||
    "courier") as StatusType;
  const paymentMethod: StatusType =
    (order.payment_method as StatusType) || "cod";

  const copyToClipboard = (text: string, label: string, fieldId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(`${label} copied!`);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // const CopyIcon = ({ fieldId }: { fieldId: string }) =>
  //   copiedField === fieldId ? (
  //     <Check size={14} className="text-green-500" />
  //   ) : (
  //     <Copy size={14} />
  //   );

  // Calculate savings
  const totalSavings = order.order_items.reduce((acc, item) => {
    const base = item.variant_details?.base_price ?? item.unit_price;
    const discounted =
      item.variant_details?.discounted_price ?? item.discounted_price ?? base;
    return discounted < base ? acc + (base - discounted) * item.quantity : acc;
  }, 0);

  const subtotal = order.order_items.reduce((acc, item) => {
    const base = item.variant_details?.base_price ?? item.unit_price;
    const discounted =
      item.variant_details?.discounted_price ?? item.discounted_price ?? base;
    return acc + (discounted < base ? discounted : base) * item.quantity;
  }, 0);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelect) {
      onSelect(order.id, e.target.checked);
    }
  };


  const displayCurrencyIcon = currencyLoading ? null : currencyIcon ?? null;
  // const displayCurrency = currencyLoading ? "" : currency ?? "";
  const displayCurrencyIconSafe = displayCurrencyIcon || "৳"; // fallback

  return (
    <div className="space-y-4">
      {/* Header with Checkbox */}
      <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-lg p-3 text-white shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-2 flex-1">
            {onSelect && (
              <input
                type="checkbox"
                checked={selected}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-blue-600 rounded mt-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base">
                Order #{order.order_number}
              </div>
              <div className="text-xs flex items-center gap-1 mt-1">
                <Calendar size={12} />{" "}
                {new Date(order.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-base">
              {displayCurrencyIconSafe}{order.total_amount.toFixed(2)}
            </div>
            <div className="text-xs flex items-center gap-1 mt-1">
              <BadgeCheck size={12} />
              {isPaid ? "Payment Completed" : "Payment Pending"}
            </div>
          </div>
        </div>

        {/* Selection indicator */}
        {onSelect && selected && (
          <div className="flex items-center gap-1 mt-2 text-blue-200 text-xs">
            <Check size={12} />
            Selected for bulk action
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-white rounded-lg shadow-sm border flex flex-col items-center">
          <Package className="text-blue-600" />
          <div className="font-semibold text-sm">
            {order.order_items.length}
          </div>
          <div className="text-xs text-gray-500">Items</div>
        </div>
        <div className="p-2 bg-white rounded-lg shadow-sm border flex flex-col items-center">
          <Shield className="text-purple-600" />
          <div className="font-semibold text-sm">
          {displayCurrencyIconSafe}{order.tax_amount.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">Tax</div>
        </div>
        <div className="p-2 bg-white rounded-lg shadow-sm border flex flex-col items-center">
          <DollarSign className="text-green-600" />
          <div className="font-semibold text-sm"> {displayCurrencyIconSafe}{subtotal.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Subtotal</div>
        </div>
        <div className="p-2 bg-white rounded-lg shadow-sm border flex flex-col items-center">
          <Truck className="text-orange-600" />
          <div className="font-semibold text-sm">
            {order.shipping_fee === 0
              ? "Free"
              : ` ${displayCurrencyIconSafe}${order.shipping_fee.toFixed(2)}`}
          </div>
          <div className="text-xs text-gray-500">Shipping</div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-white rounded-lg shadow-sm border flex flex-col items-center">
          <div className="text-xs text-gray-500">Order</div>
          <StatusTag status={order.status as StatusType} size="small" />
        </div>
        <div className="p-2 bg-white rounded-lg shadow-sm border flex flex-col items-center">
          <div className="text-xs text-gray-500">Payment</div>
          <StatusTag status={order.payment_status as StatusType} size="small" />
        </div>
        <div className="p-2 bg-white rounded-lg shadow-sm border flex flex-col items-center">
          <div className="text-xs text-gray-500">Delivery</div>
          <StatusTag status={deliveryOption} size="small" />
        </div>
        <div className="p-2 bg-white rounded-lg shadow-sm border flex flex-col items-center">
          <div className="text-xs text-gray-500">Payment Method</div>
          <StatusTag status={paymentMethod} size="small" />
        </div>
      </div>

      {/* Products */}
      <div className="bg-white rounded-lg shadow-sm border p-2 space-y-2">
        {order.order_items.map((item) => {
          const base = item.variant_details?.base_price ?? item.unit_price;
          const discounted =
            item.variant_details?.discounted_price ??
            item.discounted_price ??
            base;
          const hasDiscount = discounted < base;
          return (
            <div
              key={item.id}
              className="flex justify-between items-center text-xs"
            >
              <div className="flex flex-col">
                <span>{item.product_name}</span>
                {hasDiscount && (
                  <span className="line-through text-gray-400 text-[10px]">
                     {displayCurrencyIconSafe}{base.toFixed(2)}
                  </span>
                )}
                <span
                  className={`font-semibold ${
                    hasDiscount ? "text-green-600" : ""
                  }`}
                >
                   {displayCurrencyIconSafe}{discounted.toFixed(2)} × {item.quantity}
                </span>
              </div>
              <div className="font-semibold">
                 {displayCurrencyIconSafe}{(discounted * item.quantity).toFixed(2)}
              </div>
            </div>
          );
        })}
        {totalSavings > 0 && (
          <div className="text-green-600 font-semibold text-xs text-right">
            Saved:  {displayCurrencyIconSafe}{totalSavings.toFixed(2)}
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-2 text-xs space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span> {displayCurrencyIconSafe}{order.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span> {displayCurrencyIconSafe}{(order.subtotal - order.total_amount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span> {displayCurrencyIconSafe}{order.shipping_fee.toFixed(2)}</span>
        </div>
        {order.tax_amount > 0 && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span> {displayCurrencyIconSafe}{order.tax_amount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold border-t pt-1">
          <span>Total</span>
          <span> {displayCurrencyIconSafe}{order.total_amount.toFixed(2)}</span>
        </div>
      </div>

      {/* Addresses */}
      <div className="bg-white rounded-lg shadow-sm border p-2 space-y-2 text-xs">
        <div className="flex items-center gap-1 font-semibold">
          <User size={12} /> Shipping
        </div>
        <div>{address.customer_name}</div>
        <div>{address.phone}</div>
        <div>{fullShippingAddress}</div>
        <button
          className="text-blue-500 flex items-center gap-1"
          onClick={() =>
            copyToClipboard(
              fullShippingAddress,
              "Shipping Address",
              "shipping-address"
            )
          }
        >
          {copiedField === "shipping-address" ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <Copy size={12} />
          )}
          {copiedField === "shipping-address" ? "Copied!" : "Copy Address"}
        </button>

        <div className="flex items-center gap-1 font-semibold mt-2">
          <User size={12} /> Billing
        </div>
        <div>{billingAddress.customer_name}</div>
        <div>{billingAddress.phone}</div>
        <div>{fullBillingAddress}</div>
        <button
          className="text-blue-500 flex items-center gap-1"
          onClick={() =>
            copyToClipboard(
              fullBillingAddress,
              "Billing Address",
              "billing-address"
            )
          }
        >
          {copiedField === "billing-address" ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <Copy size={12} />
          )}
          {copiedField === "billing-address" ? "Copied!" : "Copy Address"}
        </button>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-white rounded-lg shadow-sm border p-2 text-xs">
          <div className="font-semibold mb-1 flex items-center gap-1">
            <FileText size={12} /> Notes
          </div>
          <div>{order.notes}</div>
        </div>
      )}
    </div>
  );
};

export default MobileDetailedViewFull;
