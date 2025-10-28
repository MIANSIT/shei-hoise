"use client";

import React, { useState, useEffect } from "react";
import { Avatar, Space, Tooltip, App, Card } from "antd";
import type { ColumnsType } from "antd/es/table";
import { StoreOrder, OrderStatus, PaymentStatus } from "@/lib/types/order";
import StatusTag from "../StatusFilter/StatusTag";
import OrderProductTable from "./OrderProductTable";
import DetailedOrderView from "../TableData/DetailedOrderView";
import OrdersFilterTabs from "../StatusFilter/OrdersFilterTabs";
import DataTable from "@/app/components/admin/common/DataTable";

interface Props {
  orders: StoreOrder[];
  onUpdate: (orderId: string, changes: Partial<StoreOrder>) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

const OrdersTable: React.FC<Props> = ({
  orders,
  onUpdate,
  onRefresh,
  loading = false,
}) => {
  const { notification } = App.useApp();
  const [searchOrderId, setSearchOrderId] = useState<string>("");
  const [filteredOrders, setFilteredOrders] = useState<StoreOrder[]>(orders);
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  useEffect(() => {
    const filtered = orders.filter((o) =>
      o.order_number.toLowerCase().includes(searchOrderId.toLowerCase())
    );
    setFilteredOrders(filtered);
  }, [orders, searchOrderId]);

  const handleSearchChange = (value: string) => setSearchOrderId(value);

  const handleTabFilter = (filtered: StoreOrder[]) => {
    const finalFiltered = filtered.filter((o) =>
      o.order_number.toLowerCase().includes(searchOrderId.toLowerCase())
    );
    setFilteredOrders(finalFiltered);
  };

  const formatCurrency = (amount: number, currency: string = "BDT") => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCustomerName = (order: StoreOrder) => {
    return (
      order.customers?.first_name ||
      order.shipping_address.customer_name ||
      "Unknown Customer"
    );
  };

  const getCustomerEmail = (order: StoreOrder) => {
    return order.customers?.email || "No email";
  };

  const getCustomerPhone = (order: StoreOrder) => {
    return order.customers?.phone || order.shipping_address.phone || "No phone";
  };

  const getCustomerInitial = (order: StoreOrder) => {
    const name = getCustomerName(order);
    return name.charAt(0).toUpperCase();
  };

  // Mobile card renderer - IMPROVED
  const renderOrderCard = (order: StoreOrder) => {
    const address = order.shipping_address;
    const fullAddress = `${address.address_line_1}, ${address.city}`;

    return (
      <Card
        key={order.id}
        className="mb-4 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow border"
        styles={{
          body: {
            padding: "12px",
          },
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-blue-600 text-base sm:text-lg truncate">
              #{order.order_number}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">
              {formatDate(order.created_at)}
            </div>
          </div>
          <div className="text-right ml-2">
            <div className="font-bold text-base sm:text-lg whitespace-nowrap">
              {formatCurrency(order.total_amount, order.currency)}
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="flex items-center mb-3">
          <Avatar
            size="small"
            style={{
              backgroundColor: "#1890ff",
              color: "#fff",
              fontSize: "12px",
              fontWeight: "bold",
              marginRight: "8px",
              flexShrink: 0,
            }}
          >
            {getCustomerInitial(order)}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">
              {getCustomerName(order)}
            </div>
            <div className="text-xs text-gray-600 truncate">
              {getCustomerEmail(order)}
            </div>
            <div className="text-xs text-gray-600 truncate">
              {getCustomerPhone(order)}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="mb-3">
          <div className="text-xs sm:text-sm text-gray-600">
            <span className="font-medium">Address: </span>
            <span className="line-clamp-2">{fullAddress}</span>
          </div>
        </div>

        {/* Status Tags */}
        <div className="flex flex-wrap gap-1 sm:gap-2 mb-3">
          <StatusTag status={order.status as OrderStatus} size="small" />
          <StatusTag
            status={order.payment_status as PaymentStatus}
            size="small"
          />
        </div>

        {/* Expand Button */}
        <div className="text-right">
          <button
            onClick={() =>
              setExpandedRowKey(expandedRowKey === order.id ? null : order.id)
            }
            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium"
          >
            {expandedRowKey === order.id ? "Hide Details" : "View Details"}
          </button>
        </div>

        {/* Expanded Content */}
        {expandedRowKey === order.id && (
          <div className="mt-3 border-t pt-3">
            {order.status !== "delivered" && order.status !== "cancelled" && (
              <div className="mb-3">
                <OrderProductTable
                  order={order}
                  onSaveStatus={(s: OrderStatus) =>
                    onUpdate(order.id, { status: s })
                  }
                  onSavePaymentStatus={(s: PaymentStatus) =>
                    onUpdate(order.id, { payment_status: s })
                  }
                  onSaveDeliveryOption={(o) =>
                    onUpdate(order.id, { delivery_option: o })
                  }
                  onSavePaymentMethod={(m) =>
                    onUpdate(order.id, { payment_method: m })
                  }
                  onSaveCancelNote={(note) =>
                    onUpdate(order.id, { notes: note })
                  }
                  onRefresh={onRefresh} // Add this line
                />
              </div>
            )}
            <DetailedOrderView order={order} />
          </div>
        )}
      </Card>
    );
  };

  const columns: ColumnsType<StoreOrder> = [
    {
      title: "Order #",
      dataIndex: "order_number",
      key: "order_number",
      render: (orderNumber: string) => (
        <span className="font-medium text-blue-600 text-sm">
          #{orderNumber}
        </span>
      ),
      width: 100,
      fixed: "left" as const,
      responsive: ["md"],
    },
    {
      title: "Customer",
      key: "customer",
      render: (_, order: StoreOrder) => (
        <Space size="small">
          <Avatar
            size="small"
            style={{
              backgroundColor: "#1890ff",
              color: "#fff",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {getCustomerInitial(order)}
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate max-w-[100px] lg:max-w-[120px]">
              {getCustomerName(order)}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[100px] lg:max-w-[120px]">
              {getCustomerEmail(order)}
            </div>
          </div>
        </Space>
      ),
      width: 150,
      responsive: ["md"],
    },
    {
      title: "Address",
      key: "address",
      render: (_, order: StoreOrder) => {
        const address = order.shipping_address;
        const fullAddress = `${address.address_line_1}, ${address.city}`;
        return (
          <Tooltip title={fullAddress}>
            <div className="truncate max-w-[120px] lg:max-w-[150px] text-xs lg:text-sm">
              {address.address_line_1}, {address.city}
            </div>
          </Tooltip>
        );
      },
      width: 150,
      responsive: ["lg"],
    },
    {
      title: "Total",
      key: "total",
      render: (_, order: StoreOrder) => (
        <span className="font-semibold text-gray-900 text-sm">
          {formatCurrency(order.total_amount, order.currency)}
        </span>
      ),
      width: 100,
      align: "right" as const,
      responsive: ["sm"],
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: OrderStatus) => (
        <StatusTag status={status} size="small" />
      ),
      width: 100,
      responsive: ["sm"],
    },
    {
      title: "Payment",
      dataIndex: "payment_status",
      key: "payment_status",
      render: (status: PaymentStatus) => (
        <StatusTag status={status} size="small" />
      ),
      width: 100,
      responsive: ["md"],
    },
    {
      title: "Date",
      key: "created_at",
      render: (_, order: StoreOrder) => (
        <div className="text-xs text-gray-600">
          {formatDate(order.created_at)}
        </div>
      ),
      width: 120,
      responsive: ["lg"],
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <OrdersFilterTabs
          orders={orders}
          onFilter={handleTabFilter}
          searchValue={searchOrderId}
          onSearchChange={handleSearchChange}
        />
      </div>

      <DataTable<StoreOrder>
        columns={columns}
        data={filteredOrders}
        loading={loading}
        rowKey={(record) => record.id}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} orders`,
          responsive: true,
        }}
        size="middle"
        expandable={{
          expandedRowKeys: expandedRowKey ? [expandedRowKey] : [],
          onExpand: (expanded, record) =>
            setExpandedRowKey(expanded ? record.id : null),
          expandedRowRender: (order: StoreOrder) => (
            <div className="space-y-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
              {order.status !== "delivered" && order.status !== "cancelled" && (
                <OrderProductTable
                  order={order}
                  onSaveStatus={(s: OrderStatus) =>
                    onUpdate(order.id, { status: s })
                  }
                  onSavePaymentStatus={(s: PaymentStatus) =>
                    onUpdate(order.id, { payment_status: s })
                  }
                  onSaveDeliveryOption={(o) =>
                    onUpdate(order.id, { delivery_option: o })
                  }
                  onSavePaymentMethod={(m) =>
                    onUpdate(order.id, { payment_method: m })
                  }
                  onSaveCancelNote={(note) =>
                    onUpdate(order.id, { notes: note })
                  }
                />
              )}
              <DetailedOrderView order={order} />
            </div>
          ),
        }}
        scroll={{ x: 800 }}
        responsive={true}
        renderCard={renderOrderCard}
      />
    </div>
  );
};

export default OrdersTable;
