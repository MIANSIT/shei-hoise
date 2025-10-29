import React from "react";
import { StoreOrder, OrderStatus, PaymentStatus, DeliveryOption, PaymentMethod } from "../../../../../../lib/types/order";
import OrderProductTable from "./OrderProductTable";

interface Props {
  order: StoreOrder;
  onUpdate: (orderId: string, changes: Partial<StoreOrder>) => void;
}

const OrderExpandRow: React.FC<Props> = ({ order, onUpdate }) => {
  return (
    <OrderProductTable
      order={order}
      onSaveStatus={(status: OrderStatus) => onUpdate(order.id, { status })}
      onSavePaymentStatus={(paymentStatus: PaymentStatus) =>
        onUpdate(order.id, { payment_status: paymentStatus })
      }
      onSaveDeliveryOption={(deliveryOption: DeliveryOption) =>
        onUpdate(order.id, { delivery_option: deliveryOption })
      }
      onSavePaymentMethod={(paymentMethod: PaymentMethod) =>
        onUpdate(order.id, { payment_method: paymentMethod })
      }
      onSaveCancelNote={(note: string) =>
        onUpdate(order.id, { notes: note })
      }
    />
  );
};

export default OrderExpandRow;