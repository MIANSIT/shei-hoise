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
  saving?: boolean;
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

  useEffect(() => {
    onSelectCancelNote?.(note);
  }, [note, onSelectCancelNote]);

  const isCancelled = selectedStatus === "cancelled";
  const isDelivered = selectedStatus === "delivered";

  return (
    <div
      className="
        flex flex-col sm:flex-row sm:flex-wrap
        gap-4 sm:gap-6 
        items-start sm:items-center
        mt-2
        w-full
      "
    >
      {/* Order Status */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
        <span className="font-medium text-sm sm:text-base whitespace-nowrap">
          Order Status:
        </span>
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

      {/* Cancel Note */}
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
            className="w-full sm:w-72 md:w-80"
            size="small"
          />
        </div>
      )}

      {/* Payment Status */}
      {!isCancelled && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
          <span className="font-medium text-sm sm:text-base whitespace-nowrap">
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
          <span className="font-medium text-sm sm:text-base whitespace-nowrap">
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
          <span className="font-medium text-sm sm:text-base whitespace-nowrap">
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
        <div className="w-full sm:w-auto">
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
            size="middle"
            className="w-full sm:w-auto"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrderControls;
