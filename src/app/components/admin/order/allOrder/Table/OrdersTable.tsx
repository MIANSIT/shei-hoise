"use client";

import React, { useState, useEffect } from "react";
import { Avatar, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Order, Product } from "@/lib/types/types";
import StatusTag from "../StatusFilter/StatusTag";
import OrderProductTable from "./OrderProductTable";
import DetailedOrderView from "../TableData/DetailedOrderView";
import OrdersFilterTabs from "../StatusFilter/OrdersFilterTabs";
import DataTable from "@/app/components/admin/common/DataTable";

interface Props {
  orders: Order[];
  onUpdate: (orderId: number, changes: Partial<Order>) => void;
}

const OrdersTable: React.FC<Props> = ({ orders, onUpdate }) => {
  const [searchOrderId, setSearchOrderId] = useState<string>("");
  const [filteredOrders, setFilteredOrders] = useState<Order[]>(orders);

  useEffect(() => {
    const filtered = orders.filter((o) =>
      o.id.toString().includes(searchOrderId)
    );
    setFilteredOrders(filtered);
  }, [orders, searchOrderId]);

  const handleSearchChange = (value: string) => {
    setSearchOrderId(value);
  };

  const handleTabFilter = (filtered: Order[]) => {
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
            <div className=" text-xs">{user.email}</div>
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
      {/* Search + Tabs */}
      <div className="mb-4">
        <OrdersFilterTabs
          orders={orders}
          onFilter={handleTabFilter}
          searchValue={searchOrderId}
          onSearchChange={handleSearchChange}
        />
      </div>

      {/* DataTable */}
      <DataTable<Order>
        columns={columns}
        data={filteredOrders}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        size="middle"
        expandable={{
          expandedRowRender: (order: Order) => (
            <div className="space-y-6">
              {/* Show editable controls only if order is not delivered or cancelled */}
              {order.status !== "delivered" && order.status !== "cancelled" && (
                <OrderProductTable
                  order={order}
                  onSaveStatus={(s) => onUpdate(order.id, { status: s })}
                  onSavePaymentStatus={(s) =>
                    onUpdate(order.id, { paymentStatus: s })
                  }
                  onSaveDeliveryOption={(o) =>
                    onUpdate(order.id, { deliveryOption: o })
                  }
                  onSavePaymentMethod={(m) =>
                    onUpdate(order.id, { paymentMethod: m })
                  }
                  onSaveCancelNote={(note) =>
                    onUpdate(order.id, { cancelNote: note })
                  }
                />
              )}

              {/* Always show detailed view */}
              <DetailedOrderView order={order} />
            </div>
          ),
        }}
      />
    </div>
  );
};

export default OrdersTable;
