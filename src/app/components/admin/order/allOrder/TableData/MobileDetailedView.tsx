"use client";

import React, { useState } from "react";
import { App } from "antd";
import { StoreOrder } from "@/lib/types/order";
import StatusTag, { StatusType } from "../StatusFilter/StatusTag";
import { Copy, Check, Phone, MapPin, User } from "lucide-react";

interface Props {
  order: StoreOrder;
}

const MobileDetailedView: React.FC<Props> = ({ order }) => {
  const { message } = App.useApp();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const address = order.shipping_address;
  const fullAddress = `${address.address_line_1}, ${address.city}, ${address.country}`;
  const isCancelled = order.status === "cancelled";

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
    <div className="space-y-4">
      {/* Order Items - Simplified */}
      <div className="bg-white rounded-lg p-3 border">
        <h4 className="font-semibold mb-2 text-sm">Order Items</h4>
        <div className="space-y-2">
          {order.order_items.map((item, index) => (
            <div key={index} className="flex justify-between text-xs">
              <span className="truncate flex-1">{item.product_name}</span>
              <span className="font-medium ml-2">
                ৳{item.total_price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing - Simplified */}
      <div className="bg-white rounded-lg p-3 border">
        <h4 className="font-semibold mb-2 text-sm">Pricing</h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>৳{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping:</span>
            <span>৳{order.shipping_fee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1">
            <span>Total:</span>
            <span>৳{order.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Customer Info - Simplified */}
      <div className="bg-white rounded-lg p-3 border">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-blue-500" />
          <h4 className="font-semibold text-sm">Customer</h4>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center">
            <span>{address.customer_name}</span>
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
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1">
              <Phone size={12} />
              {address.phone}
            </span>
            <button
              onClick={() =>
                copyToClipboard(address.phone, "Phone number", "customer-phone")
              }
              className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
            >
              <CopyIcon fieldId="customer-phone" />
            </button>
          </div>
        </div>
      </div>

      {/* Address - Simplified */}
      <div className="bg-white rounded-lg p-3 border">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-green-500" />
          <h4 className="font-semibold text-sm">Delivery Address</h4>
        </div>
        <div className="text-xs text-gray-600 mb-2">
          {address.address_line_1}, {address.city}
        </div>
        <button
          onClick={() =>
            copyToClipboard(fullAddress, "Full address", "full-address")
          }
          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
        >
          {copiedField === "full-address" ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <Copy size={12} />
          )}
          {copiedField === "full-address" ? "Copied!" : "Copy Address"}
        </button>
      </div>

      {/* Status Info - Simplified */}
      <div className="bg-white rounded-lg p-3 border">
        <h4 className="font-semibold mb-2 text-sm">Status</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Order</div>
            <StatusTag status={order.status as StatusType} size="small" />
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Payment</div>
            <StatusTag
              status={order.payment_status as StatusType}
              size="small"
            />
          </div>
          {!isCancelled && (
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Delivery</div>
              <StatusTag
                status={(order.delivery_option || "courier") as StatusType}
                size="small"
              />
            </div>
          )}
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">Pay Method</div>
            <StatusTag
              status={(order.payment_method as StatusType) || "cod"}
              size="small"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div
          className={`p-3 rounded-lg text-xs ${
            isCancelled
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-yellow-50 border border-yellow-200 text-gray-800"
          }`}
        >
          <strong>{isCancelled ? "Cancellation Note:" : "Order Notes:"}</strong>{" "}
          {order.notes}
        </div>
      )}
    </div>
  );
};

export default MobileDetailedView;
