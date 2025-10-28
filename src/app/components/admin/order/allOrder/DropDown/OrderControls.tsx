"use client";

import React, { useState, useEffect } from "react";
import { Button, Input } from "antd";
import StatusTag from "../StatusFilter/StatusTag";
import EditableOrderStatus from "./EditableOrderStatus";
import EditablePaymentStatus from "./EditablePaymentStatus";
import EditableDeliveryOption from "./EditableDeliveryOption";
import EditablePaymentMethod from "./EditablePaymentMethod";
import {
  OrderStatus,
  PaymentStatus,
  DeliveryOption,
  PaymentMethod,
} from "@/lib/types/order";

interface Props {
  status: OrderStatus;
  selectedStatus: OrderStatus;
  onSelectStatus: (v: OrderStatus) => void;

  paymentStatus: PaymentStatus;
  selectedPaymentStatus: PaymentStatus;
  onSelectPaymentStatus: (v: PaymentStatus) => void;

  deliveryOption: DeliveryOption;
  selectedDeliveryOption: DeliveryOption;
  onSelectDeliveryOption: (v: DeliveryOption) => void;

  paymentMethod: PaymentMethod;
  selectedPaymentMethod: PaymentMethod;
  onSelectPaymentMethod: (v: PaymentMethod) => void;

  cancelNote?: string;
  onSelectCancelNote?: (note: string) => void;

  isLocked: boolean;
  onSaveAll: () => void;
  saving?: boolean; // Add saving state
}

const OrderControls: React.FC<Props> = ({
  status,
  selectedStatus,
  onSelectStatus,
  paymentStatus,
  selectedPaymentStatus,
  onSelectPaymentStatus,
  deliveryOption,
  selectedDeliveryOption,
  onSelectDeliveryOption,
  paymentMethod,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  cancelNote,
  onSelectCancelNote,
  isLocked,
  onSaveAll,
  saving = false,
}) => {
  const [note, setNote] = useState(cancelNote || "");

  // Sync local note state with parent
  useEffect(() => {
    onSelectCancelNote?.(note);
  }, [note, onSelectCancelNote]);

  const isCancelled = selectedStatus === "cancelled";
  const isDelivered = selectedStatus === "delivered";

  return (
    <div className="flex gap-4 sm:gap-6 flex-col sm:flex-row sm:flex-wrap items-start sm:items-center mt-2">
      {/* Order Status */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm sm:text-base">Order Status:</span>
        {isDelivered || isCancelled ? (
          <StatusTag status={selectedStatus} />
        ) : (
          <EditableOrderStatus
            status={selectedStatus}
            onSave={onSelectStatus}
            hideDelivered={selectedPaymentStatus !== "paid"}
          />
        )}
      </div>

      {/* Cancelled Note */}
      {isCancelled && (
        <div className="flex flex-col w-full sm:w-auto">
          <span className="font-medium mb-1 text-sm sm:text-base">
            Cancel Note:
          </span>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for cancellation"
            rows={2}
            style={{ width: "100%", maxWidth: "300px" }}
            size="small"
          />
        </div>
      )}

      {/* Payment Status */}
      {!isCancelled && (
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm sm:text-base">
            Payment Status:
          </span>
          {paymentStatus === "paid" || isDelivered ? (
            <StatusTag status={selectedPaymentStatus} />
          ) : (
            <EditablePaymentStatus
              status={selectedPaymentStatus}
              onSave={onSelectPaymentStatus}
            />
          )}
        </div>
      )}

      {/* Delivery Option */}
      {!isCancelled && !isDelivered && (
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm sm:text-base">
            Delivery Option:
          </span>
          <EditableDeliveryOption
            option={selectedDeliveryOption}
            onSave={onSelectDeliveryOption}
          />
        </div>
      )}

      {/* Payment Method */}
      {!isCancelled && (
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm sm:text-base">
            Payment Method:
          </span>
          <EditablePaymentMethod
            method={selectedPaymentMethod}
            onSave={onSelectPaymentMethod}
          />
        </div>
      )}

      {/* Save Button */}
      {!isLocked && (
        <Button
          type="primary"
          onClick={onSaveAll}
          disabled={
            (selectedStatus === status &&
              selectedPaymentStatus === paymentStatus &&
              selectedDeliveryOption === deliveryOption &&
              selectedPaymentMethod === paymentMethod &&
              note === cancelNote) ||
            saving
          }
          loading={saving}
          size="small"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      )}
    </div>
  );
};

export default OrderControls;
