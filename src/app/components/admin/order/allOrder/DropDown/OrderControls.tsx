"use client";

import React, { useState, useEffect } from "react";
import { Button, Input } from "antd";
import StatusTag from "../StatusFilter/StatusTag";
import EditableOrderStatus from "./EditableOrderStatus";
import EditablePaymentStatus from "./EditablePaymentStatus";
import EditableDeliveryOption from "./EditableDeliveryOption";
import EditablePaymentMethod from "./EditablePaymentMethod";
import { Order } from "@/lib/types/types";

interface Props {
  status: Order["status"];
  selectedStatus: Order["status"];
  onSelectStatus: (v: Order["status"]) => void;

  paymentStatus: Order["paymentStatus"];
  selectedPaymentStatus: Order["paymentStatus"];
  onSelectPaymentStatus: (v: Order["paymentStatus"]) => void;

  deliveryOption: Order["deliveryOption"];
  selectedDeliveryOption: Order["deliveryOption"];
  onSelectDeliveryOption: (v: Order["deliveryOption"]) => void;

  paymentMethod: Order["paymentMethod"];
  selectedPaymentMethod: Order["paymentMethod"];
  onSelectPaymentMethod: (v: Order["paymentMethod"]) => void;

  cancelNote?: string;
  onSelectCancelNote?: (note: string) => void;

  isLocked: boolean;
  onSaveAll: () => void;
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
}) => {
  const [note, setNote] = useState(cancelNote || "");

  // Sync local note state with parent
  useEffect(() => {
    onSelectCancelNote?.(note);
  }, [note, onSelectCancelNote]);

  const isCancelled = selectedStatus === "cancelled";
  const isDelivered = selectedStatus === "delivered";

  return (
    <div className="flex gap-6 flex-wrap items-center mt-2">
      {/* Order Status */}
      <div>
        <span className="font-medium">Order Status:</span>{" "}
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
      {/* Cancelled Note */}
      {isCancelled && (
        <div className="flex flex-col">
          <span className="font-medium mb-1">Cancel Note:</span>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for cancellation"
            rows={4} // height of textarea
            style={{ width: 300 }}
          />
        </div>
      )}

      {/* Payment Status */}
      {!isCancelled && (
        <div>
          <span className="font-medium">Payment Status:</span>{" "}
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
        <div>
          <span className="font-medium">Delivery Option:</span>{" "}
          <EditableDeliveryOption
            option={selectedDeliveryOption}
            onSave={onSelectDeliveryOption}
          />
        </div>
      )}

      {/* Payment Method */}
      {!isCancelled && (
        <div>
          <span className="font-medium">Payment Method:</span>{" "}
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
            selectedStatus === status &&
            selectedPaymentStatus === paymentStatus &&
            selectedDeliveryOption === deliveryOption &&
            selectedPaymentMethod === paymentMethod &&
            note === cancelNote
          }
        >
          Save
        </Button>
      )}
    </div>
  );
};

export default OrderControls;
