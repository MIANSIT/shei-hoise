"use client";

import React, { useState, useEffect } from "react";
import { Button, Input } from "antd";
import EditableOrderStatus from "./EditableOrderStatus";
import EditablePaymentStatus from "./EditablePaymentStatus";
// import EditableDeliveryOption from "./EditableDeliveryOption";
import EditablePaymentMethod from "./EditablePaymentMethod";
import EditableCourier from "./EditableCourier";
import {
  OrderStatus,
  PaymentStatus,
  DeliveryOption,
  PaymentMethod,
} from "@/lib/types/enums";
import { useTranslation } from "@/lib/hook/useTranslation";
import { isCourierLocked } from "@/lib/utils/courierStatus";

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

  courier: string;
  selectedCourier: string;
  onSelectCourier: (v: string) => void;
  storeId: string;
  courierConsignmentId?: string | null;
  courierOrderStatus?: string | null;

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
  // onSelectDeliveryOption,
  paymentMethod,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  courier,
  selectedCourier,
  onSelectCourier,
  storeId,
  courierConsignmentId,
  courierOrderStatus,
  cancelNote,
  onSelectCancelNote,
  isLocked,
  onSaveAll,
  saving = false,
}) => {
  const t = useTranslation();
  const [note, setNote] = useState(cancelNote || "");

  useEffect(() => {
    onSelectCancelNote?.(note);
  }, [note, onSelectCancelNote]);

  const isCancelled = selectedStatus === "cancelled";
  const courierLocked = isCourierLocked(courierConsignmentId, courierOrderStatus, status);

  const hasChanges =
    selectedStatus !== status ||
    selectedPaymentStatus !== paymentStatus ||
    selectedDeliveryOption !== deliveryOption ||
    selectedPaymentMethod !== paymentMethod ||
    selectedCourier !== courier ||
    note !== (cancelNote || "");

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
        <EditableOrderStatus
          status={selectedStatus}
          onSave={onSelectStatus}
        />
        {selectedStatus !== status && (
          <span className="text-xs text-orange-500 font-medium">Unsaved</span>
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
          {note !== (cancelNote || "") && (
            <span className="text-xs text-orange-500 font-medium mt-1">
              Unsaved
            </span>
          )}
        </div>
      )}

      {/* Payment Status */}
      {!isCancelled && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
          <span className="font-medium text-sm sm:text-base whitespace-nowrap">
            Payment Status:
          </span>
          <EditablePaymentStatus
            status={selectedPaymentStatus}
            onSave={onSelectPaymentStatus}
          />
          {selectedPaymentStatus !== paymentStatus && (
            <span className="text-xs text-orange-500 font-medium">Unsaved</span>
          )}
        </div>
      )}

      {/* Delivery Option */}
      {/* {!isCancelled && !isDelivered && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
          <span className="font-medium text-sm sm:text-base whitespace-nowrap">
            Delivery Option:
          </span>
          <EditableDeliveryOption
            option={selectedDeliveryOption}
            onSave={onSelectDeliveryOption}
          />
          {selectedDeliveryOption !== deliveryOption && (
            <span className="text-xs text-orange-500 font-medium">Unsaved</span>
          )}
        </div>
      )} */}

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
          {selectedPaymentMethod !== paymentMethod && (
            <span className="text-xs text-orange-500 font-medium">Unsaved</span>
          )}
        </div>
      )}

      {/* Delivery Courier */}
      {!isCancelled && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
          <span className="font-medium text-sm sm:text-base whitespace-nowrap">
            {t.admin.orderSummaryDeliveryCourier}:
          </span>
          <EditableCourier
            courier={selectedCourier}
            storeId={storeId}
            onSave={onSelectCourier}
            disabled={courierLocked}
          />
          {selectedCourier !== courier && (
            <span className="text-xs text-orange-500 font-medium">Unsaved</span>
          )}
          {courierLocked && (
            <span className="text-xs text-muted-foreground">
              {status === "delivered" || status === "cancelled"
                ? t.admin.orderSummaryCourierLockedFinalized
                : t.admin.orderSummaryCourierLocked}
            </span>
          )}
          {!courierLocked && courierConsignmentId && (
            <span className="text-xs text-amber-600">
              {t.admin.orderSummaryCourierWillArchive}
            </span>
          )}
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="w-full sm:w-auto flex justify-end pt-2 border-t sm:border-t-0 sm:pt-0">
          <Button
            type="primary"
            onClick={onSaveAll}
            loading={saving}
            size="middle"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrderControls;