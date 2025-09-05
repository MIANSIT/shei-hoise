import React from "react";
import { Order } from "../../../../../../lib/types/types";
import OrderProductTable from "./OrderProductTable";

interface Props {
  order: Order;
  onUpdate: (orderId: number, changes: Partial<Order>) => void;
}

const OrderExpandRow: React.FC<Props> = ({ order, onUpdate }) => {
  return (
    <OrderProductTable
      order={order}
      onSaveStatus={(status) => onUpdate(order.id, { status })}
      onSavePaymentStatus={(paymentStatus) =>
        onUpdate(order.id, { paymentStatus })
      }
      onSaveDeliveryOption={(deliveryOption) =>
        onUpdate(order.id, { deliveryOption })
      }
      onSavePaymentMethod={(paymentMethod) =>
        onUpdate(order.id, { paymentMethod })
      }
    />
  );
};

export default OrderExpandRow;
