import { ColumnsType } from "antd/es/table";
import { Avatar, Space, Tooltip } from "antd";
import { Order, Product } from "../../../../../../lib/types/types";
import StatusTag from "../../../../../components/admin/order/allOrder/StatusFilter/StatusTag";
export const getOrderColumns = (): ColumnsType<Order> => [
  {
    title: "User Info",
    dataIndex: "user",
    key: "user",
    render: (user: Order["user"]) => (
      <Space>
        <Avatar src={user.avatar} />
        <div>
          <div className="font-medium">{user.name}</div>
          <div className=" text-xs">{user.email}</div>
        </div>
      </Space>
    ),
  },
  {
    title: "Total Price",
    key: "total",
    render: (_: unknown, order: Order) => {
      const total = order.products.reduce(
        (sum: number, p: Product) => sum + p.price * p.quantity,
        0
      );

      const tooltipText = order.products
        .map((p) => `${p.title}: ${p.quantity}`)
        .join(", ");

      return (
        <Tooltip title={tooltipText}>
          <div className="truncate max-w-[120px]">${total.toFixed(2)}</div>
        </Tooltip>
      );
    },
  },
  {
    title: "Order Status",
    dataIndex: "status",
    key: "status",
    render: (status: Order["status"]) => <StatusTag status={status} />,
  },
  {
    title: "Payment Status",
    dataIndex: "paymentStatus",
    key: "paymentStatus",
    render: (status: Order["paymentStatus"]) => <StatusTag status={status} />,
  },
  {
    title: "Order Date",
    dataIndex: "orderDate",
    key: "orderDate",
  },
];
