import React from "react";
import { Button } from "antd";
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
  isLocked,
  onSaveAll,
}) => {
  return (
    <div className="flex gap-6 flex-wrap items-center mt-2">
      {/* Order Status */}
      <div>
        <span className="font-medium">Order Status:</span>{" "}
        {status === "delivered" || status === "cancelled" ? (
          <StatusTag status={status} />
        ) : (
          <EditableOrderStatus
            status={selectedStatus}
            onSave={onSelectStatus}
            hideDelivered={selectedPaymentStatus !== "paid"} // hide Delivered if not paid
          />
        )}
      </div>

      {/* Payment Status */}
      <div>
        <span className="font-medium">Payment Status:</span>{" "}
        {paymentStatus === "paid" ? (
          <StatusTag status="paid" />
        ) : (
          <EditablePaymentStatus
            status={selectedPaymentStatus}
            onSave={onSelectPaymentStatus}
          />
        )}
      </div>

      {/* Delivery Option */}

      <div>
        <span className="font-medium">Delivery Option:</span>{" "}
        <EditableDeliveryOption
          option={selectedDeliveryOption}
          onSave={onSelectDeliveryOption}
        />
      </div>

      {/* Payment Method */}
      <div>
        <span className="font-medium">Payment Method:</span>{" "}
        <EditablePaymentMethod
          method={selectedPaymentMethod}
          onSave={onSelectPaymentMethod}
        />
      </div>

      {/* Save Button */}
      {!isLocked && (
        <Button
          type="primary"
          onClick={onSaveAll}
          disabled={
            selectedStatus === status &&
            selectedPaymentStatus === paymentStatus &&
            selectedDeliveryOption === deliveryOption &&
            selectedPaymentMethod === paymentMethod
          }
        >
          Save
        </Button>
      )}
    </div>
  );
};

export default OrderControls;
