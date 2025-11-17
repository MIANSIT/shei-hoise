/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Avatar, Space, Tooltip, App, Card, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import { StoreOrder, OrderStatus, PaymentStatus } from "@/lib/types/order";
import StatusTag from "../StatusFilter/StatusTag";
import OrderProductTable from "./OrderProductTable";
import DetailedOrderView from "../TableData/DetailedOrderView";
import OrdersFilterTabs from "../StatusFilter/OrdersFilterTabs";
import DataTable from "@/app/components/admin/common/DataTable";
import MobileDetailedView from "../TableData/MobileDetailedView";
import { EditOutlined, DeleteOutlined, FileTextOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import BulkActions from "./BulkActions";
import { Check } from "lucide-react";
import AnimatedInvoice from "@/app/components/invoice/AnimatedInvoice";

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
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<StoreOrder | null>(null);
  const router = useRouter();

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

  const handleEdit = (order: StoreOrder) => {
    router.push(`/dashboard/orders/edit-order/${order.order_number}`);
  };

  const handleDelete = (order: StoreOrder) => {
    notification.warning({
      message: "Delete",
      description: `Are you sure you want to delete order #${order.id}?`,
    });
    console.log("Delete order", order.id);
  };

  const handleViewInvoice = (order: StoreOrder) => {
    setSelectedOrderForInvoice(order);
    setShowInvoice(true);
  };

  // Bulk selection handlers
  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys as string[]);
  };

  const handleBulkUpdateSuccess = () => {
    setSelectedRowKeys([]);
    if (onRefresh) {
      onRefresh();
    }
  };

  const renderActionButtons = (order: StoreOrder) => (
    <div className="flex items-center gap-2 justify-center">
      <Tooltip title="Edit Order">
        <EditOutlined
          className="!text-blue-600 cursor-pointer hover:!text-blue-800 text-base"
          onClick={() => handleEdit(order)}
        />
      </Tooltip>
      <Tooltip title="Delete Order">
        <DeleteOutlined
          className="!text-red-600 cursor-pointer hover:!text-red-800 text-base"
          onClick={() => handleDelete(order)}
        />
      </Tooltip>
    </div>
  );

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

  const selectedOrderObjects = filteredOrders.filter((order) =>
    selectedRowKeys.includes(order.id)
  );

  // Updated columns with invoice button
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
        <div className="text-right">
          <div className="font-semibold text-gray-900 text-sm">
            {formatCurrency(order.total_amount, order.currency)}
          </div>
          <div className="text-xs text-gray-600">
            Ship: {formatCurrency(order.shipping_fee, order.currency)}
          </div>
          {order.tax_amount && order.tax_amount > 0 && (
            <div className="text-xs text-gray-600">
              Tax: {formatCurrency(order.tax_amount, order.currency)}
            </div>
          )}
        </div>
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
      title: "Delivery",
      dataIndex: "delivery_option",
      key: "delivery_option",
      render: (option: string) => (
        <span className="text-xs font-medium capitalize">
          {option || "Not set"}
        </span>
      ),
      width: 100,
      responsive: ["lg"],
    },
    {
      title: "Payment Method",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method: string) => (
        <span className="text-xs font-medium capitalize">
          {method === "cod" ? "Cash on Delivery" : method || "Not set"}
        </span>
      ),
      width: 120,
      responsive: ["lg"],
    },
    {
      title: "Invoice",
      key: "invoice",
      render: (_, order: StoreOrder) => (
        <Tooltip title="View Invoice">
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => handleViewInvoice(order)}
            className="!text-green-600 !p-1 !h-auto text-xs"
            size="small"
          >
          </Button>
        </Tooltip>
      ),
      width: 80,
      align: "center" as const,
      responsive: ["md"],
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, order: StoreOrder) => renderActionButtons(order),
      width: 100,
      align: "center" as const,
      responsive: ["sm"],
    },
  ];

  // Mobile card renderer - Updated with invoice button
  const renderOrderCard = (order: StoreOrder) => {
    const address = order.shipping_address;
    const fullAddress = `${address.address_line_1}, ${address.city}`;

    return (
      <Card
        key={order.id}
        className="mb-4 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow border relative"
        style={{ padding: "12px" }}
      >
        {/* Checkbox in top-right corner */}
        <div className="absolute top-3 right-3">
          <input
            type="checkbox"
            checked={selectedRowKeys.includes(order.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRowKeys([...selectedRowKeys, order.id]);
              } else {
                setSelectedRowKeys(
                  selectedRowKeys.filter((key) => key !== order.id)
                );
              }
            }}
            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-3 pr-6">
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
            <div className="text-xs text-gray-600">
              Shipping: {formatCurrency(order.shipping_fee, order.currency)}
            </div>
          </div>
        </div>

        {/* Selection indicator */}
        {selectedRowKeys.includes(order.id) && (
          <div className="flex items-center gap-1 mb-2 text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded">
            <Check size={12} />
            Selected for bulk action
          </div>
        )}

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

        {/* Backend Values Display */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <span className="text-xs font-medium text-gray-500">Delivery:</span>
            <div className="text-sm font-medium capitalize">
              {order.delivery_option || "Not set"}
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">
              Payment Method:
            </span>
            <div className="text-sm font-medium capitalize">
              {order.payment_method === "cod"
                ? "Cash on Delivery"
                : order.payment_method || "Not set"}
            </div>
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mb-3">
          <Tooltip title="View Invoice">
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={() => handleViewInvoice(order)}
              size="small"
              className="!bg-green-600 !border-green-600 hover:!bg-green-700"
            >
              Invoice
            </Button>
          </Tooltip>
          {renderActionButtons(order)}
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
                  onSaveShippingFee={(fee) =>
                    onUpdate(order.id, {
                      shipping_fee: fee,
                      total_amount: order.subtotal + order.tax_amount + fee,
                    })
                  }
                  onSaveCancelNote={(note) =>
                    onUpdate(order.id, { notes: note })
                  }
                  onRefresh={onRefresh}
                />
              </div>
            )}
            <MobileDetailedView
              order={order}
              selected={selectedRowKeys.includes(order.id)}
              onSelect={(orderId, selected) => {
                if (selected) {
                  setSelectedRowKeys([...selectedRowKeys, orderId]);
                } else {
                  setSelectedRowKeys(
                    selectedRowKeys.filter((key) => key !== orderId)
                  );
                }
              }}
            />
          </div>
        )}
      </Card>
    );
  };

  return (
    <div>
      {/* Bulk Actions Toolbar */}
      {selectedRowKeys.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-sm font-medium text-blue-800 text-center sm:text-left">
              {selectedRowKeys.length} order(s) selected
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <BulkActions
                selectedOrders={selectedOrderObjects}
                onSuccess={handleBulkUpdateSuccess}
                onClearSelection={() => setSelectedRowKeys([])}
              />
              <Button
                onClick={() => setSelectedRowKeys([])}
                className="w-full sm:w-auto"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

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
        rowSelection={{
          selectedRowKeys,
          onChange: onSelectChange,
          selections: [
            {
              key: "all",
              text: "Select All",
              onSelect: () => {
                setSelectedRowKeys(filteredOrders.map((order) => order.id));
              },
            },
            {
              key: "none",
              text: "Clear All",
              onSelect: () => {
                setSelectedRowKeys([]);
              },
            },
          ],
        }}
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
            <div className="space-y-4 p-3 sm:p-4 rounded-lg">
              {/* Show backend values at the top */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-3 bg-gray-50 rounded">
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Delivery Option:
                  </span>
                  <div className="font-medium capitalize">
                    {order.delivery_option || "Not set"}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Payment Method:
                  </span>
                  <div className="font-medium capitalize">
                    {order.payment_method === "cod"
                      ? "Cash on Delivery"
                      : order.payment_method || "Not set"}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Order Status:
                  </span>
                  <StatusTag status={order.status as OrderStatus} />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Payment Status:
                  </span>
                  <StatusTag status={order.payment_status as PaymentStatus} />
                </div>
              </div>

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
                  onSaveShippingFee={(fee) =>
                    onUpdate(order.id, {
                      shipping_fee: fee,
                      total_amount: order.subtotal + order.tax_amount + fee,
                    })
                  }
                  onSaveCancelNote={(note) =>
                    onUpdate(order.id, { notes: note })
                  }
                  onRefresh={onRefresh}
                />
              )}
              <DetailedOrderView order={order} />
            </div>
          ),
        }}
        scroll={{ x: 1000 }}
        responsive={true}
        renderCard={renderOrderCard}
      />

      {/* Invoice Modal */}
      {showInvoice && selectedOrderForInvoice && (
        <AnimatedInvoice
          isOpen={showInvoice}
          onClose={() => {
            setShowInvoice(false);
            setSelectedOrderForInvoice(null);
          }}
          orderData={selectedOrderForInvoice}
          showCloseButton={true}
          autoShow={true}
        />
      )}
    </div>
  );
};

export default OrdersTable;