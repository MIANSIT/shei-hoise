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
  loading = false 
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

  const formatCurrency = (amount: number, currency: string = 'BDT') => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCustomerName = (order: StoreOrder) => {
    return order.customers?.first_name || order.shipping_address.customer_name || 'Unknown Customer';
  };

  const getCustomerEmail = (order: StoreOrder) => {
    return order.customers?.email || 'No email';
  };

  const getCustomerPhone = (order: StoreOrder) => {
    return order.customers?.phone || order.shipping_address.phone || 'No phone';
  };

  const getCustomerInitial = (order: StoreOrder) => {
    const name = getCustomerName(order);
    return name.charAt(0).toUpperCase();
  };

  // Mobile card renderer
  const renderOrderCard = (order: StoreOrder) => {
    const address = order.shipping_address;
    const fullAddress = `${address.address_line_1}, ${address.city}`;
    
    return (
      <Card 
        key={order.id}
        className="mb-4 p-4 shadow-sm hover:shadow-md transition-shadow"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-bold text-blue-600 text-lg">#{order.order_number}</div>
            <div className="text-sm text-gray-500">{formatDate(order.created_at)}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">{formatCurrency(order.total_amount, order.currency)}</div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="flex items-center mb-3">
          <Avatar 
            style={{ 
              backgroundColor: '#1890ff',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              marginRight: '12px'
            }}
          >
            {getCustomerInitial(order)}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{getCustomerName(order)}</div>
            <div className="text-sm text-gray-600 truncate">{getCustomerEmail(order)}</div>
            <div className="text-sm text-gray-600">{getCustomerPhone(order)}</div>
          </div>
        </div>

        {/* Address */}
        <div className="mb-3">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Address: </span>
            <span className="truncate">{fullAddress}</span>
          </div>
        </div>

        {/* Status Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          <StatusTag status={order.status as OrderStatus} />
          <StatusTag status={order.payment_status as PaymentStatus} />
        </div>

        {/* Expand Button */}
        <div className="text-right">
          <button
            onClick={() => setExpandedRowKey(expandedRowKey === order.id ? null : order.id)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {expandedRowKey === order.id ? 'Hide Details' : 'View Details'}
          </button>
        </div>

        {/* Expanded Content */}
        {expandedRowKey === order.id && (
          <div className="mt-4 border-t pt-4">
            {order.status !== "delivered" && order.status !== "cancelled" && (
              <div className="mb-4">
                <OrderProductTable
                  order={order}
                  onSaveStatus={(s: OrderStatus) => onUpdate(order.id, { status: s })}
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
      title: "Order Number",
      dataIndex: "order_number",
      key: "order_number",
      render: (orderNumber: string) => (
        <span className="font-medium text-blue-600">#{orderNumber}</span>
      ),
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: "Customer Info",
      key: "customer",
      render: (_, order: StoreOrder) => (
        <Space>
          <Avatar 
            style={{ 
              backgroundColor: '#1890ff',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {getCustomerInitial(order)}
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium truncate max-w-[120px]">{getCustomerName(order)}</div>
            <div className="text-xs text-gray-500 truncate max-w-[120px]">{getCustomerEmail(order)}</div>
            <div className="text-xs text-gray-500">{getCustomerPhone(order)}</div>
          </div>
        </Space>
      ),
      width: 200,
    },
    {
      title: "Delivery Address",
      key: "address",
      render: (_, order: StoreOrder) => {
        const address = order.shipping_address;
        const fullAddress = `${address.address_line_1}, ${address.city}, ${address.country}`;
        return (
          <Tooltip title={fullAddress}>
            <div className="truncate max-w-[180px] text-sm">
              {address.address_line_1}, {address.city}
            </div>
          </Tooltip>
        );
      },
      width: 200,
    },
    {
      title: "Total Amount",
      key: "total",
      render: (_, order: StoreOrder) => (
        <span className="font-semibold text-gray-900">
          {formatCurrency(order.total_amount, order.currency)}
        </span>
      ),
      width: 120,
      align: 'right' as const,
    },
    {
      title: "Order Status",
      dataIndex: "status",
      key: "status",
      render: (status: OrderStatus) => <StatusTag status={status} />,
      width: 130,
    },
    {
      title: "Payment Status",
      dataIndex: "payment_status",
      key: "payment_status",
      render: (status: PaymentStatus) => <StatusTag status={status} />,
      width: 130,
    },
    {
      title: "Order Date",
      key: "created_at",
      render: (_, order: StoreOrder) => (
        <div className="text-sm text-gray-600">
          {formatDate(order.created_at)}
        </div>
      ),
      width: 150,
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
            `${range[0]}-${range[1]} of ${total} orders`
        }}
        size="middle"
        expandable={{
          expandedRowKeys: expandedRowKey ? [expandedRowKey] : [],
          onExpand: (expanded, record) =>
            setExpandedRowKey(expanded ? record.id : null),
          expandedRowRender: (order: StoreOrder) => (
            <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
              {order.status !== "delivered" && order.status !== "cancelled" && (
                <OrderProductTable
                  order={order}
                  onSaveStatus={(s: OrderStatus) => onUpdate(order.id, { status: s })}
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
        scroll={{ x: 1000 }}
        renderCard={renderOrderCard}
      />
    </div>
  );
};

export default OrdersTable;