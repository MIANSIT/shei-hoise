"use client";

import React, { useState } from "react";
import { Table, Avatar, Space, Tooltip, Input } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Order, Product } from "@/lib/types/types";
import StatusTag from "./StatusTag";
import OrderProductTable from "./OrderProductTable";
import DetailedOrderView from "./DetailedOrderView";
import OrdersFilterTabs from "./OrdersFilterTabs";

interface Props {
  orders: Order[];
  onUpdate: (orderId: number, changes: Partial<Order>) => void;
}

const OrdersTable: React.FC<Props> = ({ orders, onUpdate }) => {
  const [searchOrderId, setSearchOrderId] = useState<string>("");
  const [filteredOrders, setFilteredOrders] = useState<Order[]>(orders);

  // Handle search by Order ID
  const handleSearchChange = (value: string) => {
    setSearchOrderId(value);
    const filtered = orders.filter((o) => o.id.toString().includes(value));
    setFilteredOrders(filtered);
  };

  // Handle filter from tabs component
  const handleTabFilter = (filtered: Order[]) => {
    // Apply search as well
    const finalFiltered = filtered.filter((o) =>
      o.id.toString().includes(searchOrderId)
    );
    setFilteredOrders(finalFiltered);
  };

  const columns: ColumnsType<Order> = [
    {
      title: "Order ID",
      dataIndex: "id",
      key: "id",
      render: (id: number) => <span className="font-medium">#{id}</span>,
    },
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
      title: "Delivery Address",
      key: "address",
      render: (order: Order) => {
        const fullAddress =
          `${order.user.address || ""}${
            order.user.city ? ", " + order.user.city : ""
          }${order.user.country ? ", " + order.user.country : ""}`.trim() ||
          "Not Provided";
        return (
          <Tooltip title={fullAddress}>
            <div className="truncate max-w-[150px]">{fullAddress}</div>
          </Tooltip>
        );
      },
    },
    {
      title: "Total Price",
      key: "total",
      render: (_: unknown, order: Order) => {
        const total = order.products.reduce(
          (sum, p: Product) => sum + p.price * p.quantity,
          0
        );
        return <span>${total.toFixed(2)}</span>;
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

  return (
    <div>
      {/* Search input above table */}

      <div className=" mb-4">
        {/* Search input on the left */}

        {/* Filter tabs on the right */}
        <OrdersFilterTabs
          orders={orders}
          onFilter={handleTabFilter}
          searchValue={searchOrderId}
          onSearchChange={handleSearchChange}
        />
      </div>
      {/* Orders table */}
      <Table<Order>
        columns={columns}
        dataSource={filteredOrders}
        rowKey="id"
        expandable={{
          expandedRowRender: (order: Order) => (
            <div className="space-y-6">
              <OrderProductTable
                order={order}
                onSaveStatus={(s: Order["status"]) =>
                  onUpdate(order.id, { status: s })
                }
                onSavePaymentStatus={(s: Order["paymentStatus"]) =>
                  onUpdate(order.id, { paymentStatus: s })
                }
                onSaveDeliveryOption={(o: Order["deliveryOption"]) =>
                  onUpdate(order.id, { deliveryOption: o })
                }
                onSavePaymentMethod={(m: Order["paymentMethod"]) =>
                  onUpdate(order.id, { paymentMethod: m })
                }
              />
              <DetailedOrderView order={order} />
            </div>
          ),
        }}
      />
    </div>
  );
};

export default OrdersTable;
