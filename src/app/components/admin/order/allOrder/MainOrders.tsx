"use client";

import React, { useState } from "react";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import { Avatar, Space } from "antd";
import OrderProductTable from "./OrderProductTable";
import StatusTag from "./StatusTag";

export interface Order {
  id: number;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  products: {
    title: string;
    quantity: number;
    price: number;
  }[];
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  orderDate: string;
  deliveryOption: "Pathao" | "Courier" | "Other";
  paymentMethod: "COD" | "Online";
  paymentStatus: "paid" | "pending" | "failed";
}

const initialOrders: Order[] = [
  {
    id: 1,
    user: {
      name: "John Doe",
      email: "john@example.com",
      avatar: "https://i.pravatar.cc/40?img=1",
    },
    products: [
      { title: "iPhone 15", quantity: 1, price: 1200 },
      { title: "AirPods Pro", quantity: 2, price: 250 },
    ],
    status: "processing",
    orderDate: "2025-08-25",
    deliveryOption: "Pathao",
    paymentMethod: "Online",
    paymentStatus: "pending",
  },
  {
    id: 2,
    user: {
      name: "Sarah Smith",
      email: "sarah@example.com",
      avatar: "https://i.pravatar.cc/40?img=2",
    },
    products: [{ title: "MacBook Pro 14”", quantity: 1, price: 2200 }],
    status: "delivered",
    orderDate: "2025-08-20",
    deliveryOption: "Courier",
    paymentMethod: "COD",
    paymentStatus: "paid",
  },
];

const MainOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  const handleStatusChange = (orderId: number, newStatus: Order["status"]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };
  const handleDeliveryOptionChange = (
    orderId: number,
    newOption: Order["deliveryOption"]
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, deliveryOption: newOption } : o
      )
    );
  };

  const handlePaymentMethodChange = (
    orderId: number,
    newMethod: Order["paymentMethod"]
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, paymentMethod: newMethod } : o
      )
    );
  };

  const handlePaymentStatusChange = (
    orderId: number,
    newStatus: Order["paymentStatus"]
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, paymentStatus: newStatus } : o
      )
    );
  };

  const columns: ColumnsType<Order> = [
    {
      title: "User Info",
      dataIndex: "user",
      key: "user",
      render: (user: Order["user"]) => (
        <Space>
          <Avatar src={user.avatar} />
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-gray-500 text-xs">{user.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Total Price",
      key: "total",
      render: (_: unknown, order: Order) =>
        `$${order.products
          .reduce((sum, p) => sum + p.price * p.quantity, 0)
          .toFixed(2)}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: Order["status"]) => <StatusTag status={status} />,
    },
    {
      title: "Order Date",
      dataIndex: "orderDate",
      key: "orderDate",
    },
  ];

  const expandedRowRender = (order: Order) => (
    <OrderProductTable
      products={order.products}
      orderId={order.id}
      status={order.status}
      deliveryOption={order.deliveryOption}
      paymentMethod={order.paymentMethod}
      paymentStatus={order.paymentStatus}
      onSaveStatus={(newStatus) => handleStatusChange(order.id, newStatus)}
      onSavePaymentStatus={(newStatus) =>
        handlePaymentStatusChange(order.id, newStatus)
      }
      onSaveDeliveryOption={(newOption) =>
        handleDeliveryOptionChange(order.id, newOption)
      }
      onSavePaymentMethod={(newMethod) =>
        handlePaymentMethodChange(order.id, newMethod)
      }
    />
  );

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">All Orders</h2>
      <DataTable<Order>
        columns={columns}
        data={orders}
        rowKey="id"
        expandable={{ expandedRowRender }}
      />
    </div>
  );
};

export default MainOrders;
