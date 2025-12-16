/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Avatar, Space, Tooltip, App, Card, Button, Pagination } from "antd";
import type { ColumnsType } from "antd/es/table";
import { StoreOrder } from "@/lib/types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import StatusTag from "../StatusFilter/StatusTag";
import OrderProductTable from "./OrderProductTable";
import DetailedOrderView from "../TableData/DetailedOrderView";
import OrdersFilterTabs, {
  highlightText,
} from "../StatusFilter/OrdersFilterTabs";
import DataTable from "@/app/components/admin/common/DataTable";
import MobileDetailedView from "../TableData/MobileDetailedView";
import {
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import BulkActions from "./BulkActions";
import { Check } from "lucide-react";
import AnimatedInvoice from "@/app/components/invoice/AnimatedInvoice";
import dataService from "@/lib/queries/dataService";

interface Props {
  orders: StoreOrder[];
  total: number;
  page: number;
  search: string;
  pageSize: number;
  onTableChange: (pagination: { current: number; pageSize: number }) => void;
  onUpdate: (orderId: string, changes: Partial<StoreOrder>) => void;
  loading?: boolean;
  onSearchChange: (value: string) => void; // add this
  onStatusChange?: (status: string) => void;
  onPaymentStatusChange?: (status: string) => void;
}

const OrdersTable: React.FC<Props> = ({
  orders,
  onUpdate,
  search,
  onSearchChange,
  onStatusChange,
  onPaymentStatusChange,
  page,
  total,
  pageSize,
  onTableChange,
  loading = false,
}) => {
  const { notification, modal } = App.useApp();
  const [searchOrderId, setSearchOrderId] = useState<string>("");
  const [filteredOrders, setFilteredOrders] = useState<StoreOrder[]>(orders);
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] =
    useState<StoreOrder | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const filtered = orders.filter((o) => {
      const search = searchOrderId.toLowerCase();
      const customerEmail = getCustomerEmail(o).toLowerCase();
      const customerPhone = getCustomerPhone(o).toLowerCase();
      const customerName = getCustomerName(o).toLowerCase();

      return (
        o.order_number.toLowerCase().includes(search) ||
        customerEmail.includes(search) ||
        customerPhone.includes(search) ||
        customerName.includes(search)
      );
    });
    setFilteredOrders(filtered);
  }, [orders, searchOrderId]);

  // const handleSearchChange = (value: string) => setSearchOrderId(value);

 

  const handleEdit = (order: StoreOrder) => {
    router.push(`/dashboard/orders/edit-order/${order.order_number}`);
  };

  const handleDelete = async (order: StoreOrder) => {
    modal.confirm({
      title: "Confirm Delete",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete order #${order.order_number}? This action cannot be undone.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        await performDelete(order.id);
      },
    });
  };

  const performDelete = async (orderId: string) => {
    try {
      setDeleteLoading(orderId);

      // Call your API to delete the order
      await dataService.deleteOrder(orderId);

      notification.success({
        message: "Order Deleted",
        description: "Order has been deleted successfully.",
      });
    } catch (error: any) {
      console.error("Error deleting order:", error);
      notification.error({
        message: "Delete Failed",
        description:
          error.message || "Failed to delete order. Please try again.",
      });
    } finally {
      setDeleteLoading(null);
    }
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
  };

  const renderActionButtons = (order: StoreOrder) => (
    <div className="flex items-center gap-2 justify-center">
      <Tooltip title="Edit Order">
        <EditOutlined
          className="text-blue-600! cursor-pointer hover:text-blue-800! text-base"
          onClick={() => handleEdit(order)}
        />
      </Tooltip>
      <Tooltip title="Delete Order">
        <DeleteOutlined
          className={`text-red-600! cursor-pointer hover:text-red-800! text-base ${
            deleteLoading === order.id ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={() => deleteLoading !== order.id && handleDelete(order)}
          spin={deleteLoading === order.id}
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

  // ✅ FIXED: Get customer name from shipping_address
  const getCustomerName = (order: StoreOrder) => {
    return (
      order.shipping_address?.customer_name ||
      order.customers?.first_name ||
      "Unknown Customer"
    );
  };

  const getCustomerEmail = (order: StoreOrder) => {
    return order.customers?.email || "No email";
  };

  const getCustomerPhone = (order: StoreOrder) => {
    return (
      order.shipping_address?.phone || order.customers?.phone || "No phone"
    );
  };

  const getCustomerInitial = (order: StoreOrder) => {
    const name = getCustomerName(order);
    return name.charAt(0).toUpperCase();
  };

  // ✅ FIXED: Get full address with proper fallbacks
  const getFullAddress = (order: StoreOrder) => {
    const address = order.shipping_address;
    if (!address) return "No address";

    // Check for both address_line_1 and address fields
    const addressLine = address.address_line_1 || address.address || "";
    const city = address.city || "";
    const country = address.country || "";

    let fullAddress = "";
    if (addressLine) fullAddress += addressLine;
    if (city) fullAddress += (fullAddress ? ", " : "") + city;
    if (country) fullAddress += (fullAddress ? ", " : "") + country;

    return fullAddress || "Address not provided";
  };

  // ✅ FIXED: Get address for display in table (shorter version)
  const getDisplayAddress = (order: StoreOrder) => {
    const address = order.shipping_address;
    if (!address) return "No address";

    const addressLine = address.address_line_1 || address.address || "";
    const city = address.city || "";

    if (addressLine && city) {
      return `${addressLine}, ${city}`;
    } else if (addressLine) {
      return addressLine;
    } else if (city) {
      return city;
    }

    return "Address not provided";
  };

  const selectedOrderObjects = filteredOrders.filter((order) =>
    selectedRowKeys.includes(order.id)
  );

  // ✅ FIXED: Updated columns with proper address display
  const columns: ColumnsType<StoreOrder> = [
    {
      title: "Order #",
      dataIndex: "order_number",
      key: "order_number",
      render: (orderNumber: string) => (
        <span className="font-medium text-blue-600 text-sm">
          {highlightText(`#${orderNumber}`, searchOrderId)}
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
              {highlightText(getCustomerName(order), searchOrderId)}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[100px] lg:max-w-[120px]">
              {highlightText(getCustomerEmail(order), searchOrderId)}
            </div>
          </div>
        </Space>
      ),
      width: 150,
      responsive: ["md"],
    },
    {
      title: "Phone",
      key: "phone",
      render: (_, order: StoreOrder) => (
        <div className="truncate max-w-[120px] lg:max-w-[150px] text-xs lg:text-sm">
          {highlightText(getCustomerPhone(order), searchOrderId)}
        </div>
      ),
      width: 120,
      responsive: ["lg"],
    },
    {
      title: "Address",
      key: "address",
      render: (_, order: StoreOrder) => {
        const displayAddress = getDisplayAddress(order);
        const fullAddress = getFullAddress(order);

        return (
          <Tooltip title={fullAddress}>
            <div className="truncate max-w-[120px] lg:max-w-[150px] text-xs lg:text-sm">
              {displayAddress}
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
            className="text-green-600! p-1! h-auto! text-xs"
            size="small"
          ></Button>
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

  // ✅ FIXED: Mobile card renderer with proper address display
  const renderOrderCard = (order: StoreOrder) => {
    const displayAddress = getDisplayAddress(order);
    const fullAddress = getFullAddress(order);

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
              {highlightText(getCustomerName(order), searchOrderId)}
            </div>
            <div className="text-xs text-gray-600 truncate">
              {highlightText(getCustomerEmail(order), searchOrderId)}
            </div>
            <div className="text-xs text-gray-600 truncate">
              {highlightText(getCustomerPhone(order), searchOrderId)}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="mb-3">
          <div className="text-xs sm:text-sm text-gray-600">
            <span className="font-medium">Address: </span>
            <Tooltip title={fullAddress}>
              <span className="line-clamp-2">{displayAddress}</span>
            </Tooltip>
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
              className="bg-green-600! border-green-600! hover:bg-green-700!"
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
          // onFilter={handleTabFilter}
          searchValue={search} // <- use parent search state
          onSearchChange={onSearchChange}
          onStatusChange={onStatusChange} // optional now
          onPaymentStatusChange={onPaymentStatusChange} // optional now
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
        pagination={false}
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
      <div className="mt-4 flex justify-end">
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger
          showQuickJumper
          onChange={(p, ps) => onTableChange({ current: p, pageSize: ps })}
          pageSizeOptions={["5", "10", "20", "50"]}
          showTotal={(total, range) =>
            `${range[0]}-${range[1]} of ${total} items`
          }
        />
      </div>

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
