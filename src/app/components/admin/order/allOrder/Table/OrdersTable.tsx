/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import {
  Avatar,
  Space,
  Tooltip,
  App,
  Card,
  Button,
  Pagination,
  DatePicker,
  Dropdown,
  Popover,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { StoreOrder } from "@/lib/types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import StatusTag from "../StatusFilter/StatusTag";
import OrderProductTable from "./OrderProductTable";
import DetailedOrderView from "../TableData/DetailedOrderView";
import OrdersFilterTabs from "../StatusFilter/OrdersFilterTabs";
import DataTable from "@/app/components/admin/common/DataTable";
import MobileDetailedView from "../TableData/MobileDetailedView";
import { getValidCurrency } from "@/lib/utils/currency";
import {
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import BulkActions from "./BulkActions";
import BulkCourierShipmentAction from "./BulkCourierShipmentAction";
import { Check } from "lucide-react";
// import AnimatedInvoice from "@/app/components/invoice/AnimatedInvoice";
import InvoiceModal from "@/app/components/invoice/invoice";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import dataService from "@/lib/queries/dataService";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import ExportUpsell from "@/app/components/admin/common/ExportUpsell";
import { LockOutlined } from "@ant-design/icons";
import type { RiskAssessment } from "@/lib/utils/riskScoring";

interface Props {
  orders: StoreOrder[];
  riskByPhone?: Record<string, RiskAssessment>;
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
  totalOrders: number;
  initialCategory?: "order" | "payment";
  initialStatus?: string;
  totalByOrderStatus?: Record<string, number>; // <--- add this
  totalByPaymentStatus?: Record<string, number>;
  onRefresh?: () => void;
  onExportOrders?: () => Promise<StoreOrder[]>;
}

const RISK_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-gray-100", text: "text-gray-600", label: "New" },
  low: { bg: "bg-green-50", text: "text-green-700", label: "Low" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", label: "Medium" },
  high: { bg: "bg-red-50", text: "text-red-700", label: "High" },
};

const FB_STATUS_STYLES: Record<"sent" | "held" | "suppressed", { bg: string; text: string; dot: string; label: string; reason: string }> = {
  sent: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", label: "Sent", reason: "Sent to Facebook immediately after checkout" },
  held: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Held", reason: "Held — will only be sent to Facebook once this order is marked Delivered" },
  suppressed: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400", label: "Suppressed", reason: "Suppressed — this order was cancelled before the event was ever sent" },
};

const OrdersTable: React.FC<Props> = ({
  orders,
  riskByPhone,
  onUpdate,
  search,
  onSearchChange,
  onStatusChange,
  onPaymentStatusChange,
  page,
  total,
  pageSize,
  onTableChange,
  totalOrders,
  initialCategory,
  initialStatus,
  loading = false,
  totalByOrderStatus, // <--- add this
  totalByPaymentStatus,
  onRefresh,
  onExportOrders,
}) => {
  const { notification, modal } = App.useApp();
  const t = useTranslation();
  const n = useLocalNum();
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] =
    useState<StoreOrder | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  // const { icon: currencyIcon } = useUserCurrencyIcon();

  const { storeData } = useInvoiceData({
    storeId: selectedOrderForInvoice?.store_id,
  });

  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const router = useRouter();
  const {
    currency: storeCurrency,
    // icon: currencyIcon,
    // loading: currencyLoading,
  } = useUserCurrencyIcon();

  const { storeId } = useCurrentUser();
  const { allowed: exportAllowed } = useFeatureGate(storeId, "export_data");

  // const handleSearchChange = (value: string) => setSearchOrderId(value);

  const handleEdit = (order: StoreOrder) => {
    router.push(`/dashboard/orders/edit-order/${order.order_number}`);
  };

  const handleDelete = async (order: StoreOrder) => {
    if (order.status !== OrderStatus.CANCELLED) {
      notification.warning({
        title: t.admin.orderCannotDeleteTitle,
        description: `Order #${order.order_number} is "${order.status}". Please cancel the order first to restore stock before deleting.`,
        duration: 4,
      });
      return;
    }

    modal.confirm({
      title: t.admin.orderDeleteTitle,
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete order #${order.order_number}? This action cannot be undone.`,
      okText: t.admin.orderDeleteOk,
      okType: "danger",
      cancelText: t.admin.orderDeleteCancel,
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
        title: t.admin.orderDeletedSuccess,
        description: t.admin.orderDeletedSuccessDesc,
      });
      onRefresh?.();
    } catch (error: any) {
      console.error("Error deleting order:", error);
      notification.error({
        title: t.admin.orderDeleteFailed,
        description: error.title || "Failed to delete order. Please try again.",
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

  const ORDER_EXPORT_HEADER = [
    "Order #",
    "Created At",
    "Customer",
    "Email",
    "Phone",
    "Address",
    "Total",
    "Currency",
    "Status",
    "Payment Status",
  ];

  const buildOrderExportRows = (targetOrders: StoreOrder[]) =>
    targetOrders.map((o) => [
      o.order_number,
      new Date(o.created_at).toLocaleString(),
      (o.shipping_address?.customer_name || o.customers?.first_name || ""),
      o.customers?.email || o.shipping_address?.email || "",
      o.shipping_address?.phone || o.customers?.phone || "",
      (o.shipping_address?.address_line_1 || o.shipping_address?.address || "") + (o.shipping_address?.city ? (", " + o.shipping_address.city) : ""),
      o.total_amount,
      o.currency || "",
      o.status,
      o.payment_status,
    ]);

  const handleExport = async (format: "csv" | "xlsx") => {
    if (exportingCsv) return;

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (selectedRange && selectedRange.length === 2) {
      const s = selectedRange[0];
      const e = selectedRange[1];
      startDate = s && s.toDate ? s.toDate() : s ? new Date(s) : null;
      endDate = e && e.toDate ? e.toDate() : e ? new Date(e) : null;

      if (startDate) startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
      if (endDate) endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
    }

    setExportingCsv(true);
    let sourceOrders: StoreOrder[];
    try {
      // Fetch every order matching the current filters — not just the page
      // currently on screen — so the export isn't silently truncated.
      sourceOrders = onExportOrders ? await onExportOrders() : orders;
    } catch (err) {
      console.error("Error fetching orders for export:", err);
      notification.error({
        title: t.admin.orderExportFailed,
        description: err instanceof Error ? err.message : String(err),
      });
      setExportingCsv(false);
      return;
    }

    const targetOrders = startDate && endDate
      ? sourceOrders.filter((o) => {
          const d = new Date(o.created_at);
          return d >= startDate! && d <= endDate!;
        })
      : sourceOrders;

    if (!targetOrders || targetOrders.length === 0) {
      notification.info({
        title: t.admin.orderNoOrders,
        description: t.admin.orderNoOrdersDate,
      });
      setExportingCsv(false);
      return;
    }

    let datePart = "all-dates";
    if (startDate && endDate) {
      const s = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      const e = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
      datePart = `${s}_to_${e}`;
    }

    try {
      if (format === "xlsx") {
        // .xlsx has no text-encoding ambiguity — unlike CSV, it can't be
        // misread as the wrong charset by Excel regardless of Windows locale.
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.aoa_to_sheet([
          ORDER_EXPORT_HEADER,
          ...buildOrderExportRows(targetOrders),
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Orders");
        XLSX.writeFile(wb, `orders_${datePart}.xlsx`);
      } else {
        const escape = (v: any) => {
          if (v == null) return "";
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        };

        const csvContent = [ORDER_EXPORT_HEADER, ...buildOrderExportRows(targetOrders)]
          .map((r) => r.map(escape).join(","))
          .join("\n");

        // Prefix a UTF-8 BOM — without it, Excel misreads non-ASCII text (e.g.
        // Bengali addresses) as a different encoding and shows garbled characters.
        const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `orders_${datePart}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExportingCsv(false);
    }
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

  const formatCurrency = (amount: number, currency?: string | null) => {
    const finalCurrency = currency || storeCurrency || "";
    return `${finalCurrency} ${n(amount.toFixed(2))}`;
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
  const copyOrderNumber = async (orderNumber: string) => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      notification.success({
        title: t.admin.orderCopied,
        description: `Order #${orderNumber} copied to clipboard`,
        duration: 1.5,
      });
    } catch {
      notification.error({
        title: t.admin.orderCopyFailed,
        description: "Could not copy order number",
      });
    }
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

  const selectedOrderObjects = orders.filter((order) =>
    selectedRowKeys.includes(order.id),
  );

  // ✅ FIXED: Updated columns with proper address display
  const columns: ColumnsType<StoreOrder> = [
    {
      title: t.admin.orderColNum,
      dataIndex: "order_number",
      key: "order_number",
      render: (orderNumber: string) => (
        <Tooltip title="Click to copy">
          <span
            className="group inline-flex items-center gap-1 cursor-pointer text-blue-600 max-w-full overflow-hidden"
            onClick={(e) => {
              e.stopPropagation();
              copyOrderNumber(orderNumber);
            }}
          >
            <span className="truncate">#{orderNumber}</span>
            <CopyOutlined className="opacity-0 group-hover:opacity-100 text-xs shrink-0" />
          </span>
        </Tooltip>
      ),
      width: 120,
      fixed: "left" as const,
    },
    {
      title: t.admin.orderColCustomer,
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
            <div className="font-medium text-sm truncate max-w-25 lg:max-w-30">
              {getCustomerName(order)}
            </div>
          </div>
        </Space>
      ),
      width: 150,
      responsive: ["md"],
    },
    {
      title: t.admin.orderColPhone,
      key: "phone",
      render: (_, order: StoreOrder) => (
        <div className="truncate max-w-30 lg:max-w-37.5 text-xs lg:text-sm">
          {n(getCustomerPhone(order))}
        </div>
      ),
      width: 120,
      responsive: ["lg"],
    },
    {
      title: t.admin.orderColRisk,
      key: "risk",
      render: (_, order: StoreOrder) => {
        const phone = order.shipping_address?.phone;
        const risk = phone ? riskByPhone?.[phone] : undefined;
        const style = RISK_STYLES[risk?.level ?? "new"];
        return (
          <Tooltip title={risk?.reason ?? "No history yet"}>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full cursor-help ${style.bg} ${style.text}`}>
              {style.label}
            </span>
          </Tooltip>
        );
      },
      width: 90,
      responsive: ["lg"],
    },
    {
      title: t.admin.orderColFb,
      key: "fb_status",
      render: (_, order: StoreOrder) => {
        const fbStatus = order.fb_purchase_event_status ?? "sent";
        const style = FB_STATUS_STYLES[fbStatus];
        return (
          <Tooltip title={style.reason}>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full cursor-help ${style.bg} ${style.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>
          </Tooltip>
        );
      },
      width: 70,
      responsive: ["xl"],
    },
    {
      title: t.admin.orderColAddress,
      key: "address",
      render: (_, order: StoreOrder) => {
        const displayAddress = getDisplayAddress(order);
        const fullAddress = getFullAddress(order);

        return (
          <Tooltip title={fullAddress}>
            <div className="truncate max-w-30 lg:max-w-37.5 text-xs lg:text-sm">
              {displayAddress}
            </div>
          </Tooltip>
        );
      },
      width: 150,
      responsive: ["lg"],
    },
    {
      title: t.admin.orderColTotal,
      key: "total",
      render: (_, order: StoreOrder) => (
        <div className="text-right">
          <div className="font-semibold text-gray-900 dark:text-gray-300 text-sm">
            {formatCurrency(order.total_amount, order.currency)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Ship: {formatCurrency(order.shipping_fee, order.currency)}
          </div>
          {order.tax_amount != null && order.tax_amount > 0 && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
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
      title: t.admin.orderColStatus,
      dataIndex: "status",
      key: "status",
      render: (status: OrderStatus) => (
        <StatusTag status={status} size="small" />
      ),
      width: 100,
      responsive: ["sm"],
    },
    {
      title: t.admin.orderColPayment,
      dataIndex: "payment_status",
      key: "payment_status",
      render: (status: PaymentStatus) => (
        <StatusTag status={status} size="small" />
      ),
      width: 100,
      responsive: ["md"],
    },
    {
      title: t.admin.orderColDelivery,
      dataIndex: "delivery_option",
      key: "delivery_option",
      render: (option: string) => (
        <span className="text-xs font-medium capitalize">
          {option || t.admin.orderNotSet}
        </span>
      ),
      width: 100,
      responsive: ["lg"],
    },
    {
      title: t.admin.orderColPaymentMethod,
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method: string) => (
        <span className="text-xs font-medium capitalize">
          {method === "cod" ? t.admin.orderCod : method || t.admin.orderNotSet}
        </span>
      ),
      width: 120,
      responsive: ["lg"],
    },
    {
      title: t.admin.orderColInvoice,
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
      title: t.admin.orderColActions,
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
        style={{ padding: 0 }} // Add this
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
                  selectedRowKeys.filter((key) => key !== order.id),
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
              {t.admin.orderShippingLabel} {formatCurrency(order.shipping_fee, order.currency)}
            </div>
          </div>
        </div>

        {/* Selection indicator */}
        {selectedRowKeys.includes(order.id) && (
          <div className="flex items-center gap-1 mb-2 text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded">
            <Check size={12} />
            {t.admin.orderSelectedForBulk}
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
              {n(getCustomerPhone(order))}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="mb-3">
          <div className="text-xs sm:text-sm text-gray-600">
            <span className="font-medium">{t.admin.orderAddressLabel} </span>
            <Tooltip title={fullAddress}>
              <span className="line-clamp-2">{displayAddress}</span>
            </Tooltip>
          </div>
        </div>

        {/* Backend Values Display */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <span className="text-xs font-medium text-gray-500">{t.admin.orderDeliveryLabel}</span>
            <div className="text-sm font-medium capitalize">
              {order.delivery_option || t.admin.orderNotSet}
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">
              {t.admin.orderPaymentMethodLabel}
            </span>
            <div className="text-sm font-medium capitalize">
              {order.payment_method === "cod"
                ? t.admin.orderCod
                : order.payment_method || t.admin.orderNotSet}
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
              {t.admin.orderInvoiceBtn}
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
            {expandedRowKey === order.id ? t.admin.orderHideDetails : t.admin.orderViewDetails}
          </button>
        </div>

        {/* Expanded Content */}
        {expandedRowKey === order.id && (
          <div className="mt-3 border-t pt-3">
            {order.status !== OrderStatus.CANCELLED &&
              !(order.status === OrderStatus.DELIVERED && order.payment_status === PaymentStatus.PAID) && (
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
                  onSaveCourier={(c) =>
                    onUpdate(order.id, { courier: c })
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
                  onSavePathaoShipment={(consignmentId, orderStatus) =>
                    onUpdate(order.id, {
                      courier_consignment_id: consignmentId,
                      courier_order_status: orderStatus,
                    })
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
                    selectedRowKeys.filter((key) => key !== orderId),
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
              {n(selectedRowKeys.length)} {t.admin.orderSelected}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <BulkActions
                selectedOrders={selectedOrderObjects}
                onSuccess={() => {
                  handleBulkUpdateSuccess();
                  onRefresh?.(); // ✅ TRIGGER REFRESH
                }}
                onClearSelection={() => setSelectedRowKeys([])}
              />
              <BulkCourierShipmentAction
                selectedOrders={selectedOrderObjects}
                onSuccess={() => onRefresh?.()}
                onClearSelection={() => setSelectedRowKeys([])}
              />
              <Button
                onClick={() => setSelectedRowKeys([])}
                className="w-full sm:w-auto"
              >
                {t.admin.orderClearSelection}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1">
          <OrdersFilterTabs
            orders={orders}
            totalOrders={totalOrders}
            totalByOrderStatus={totalByOrderStatus}
            totalByPaymentStatus={totalByPaymentStatus}
            searchValue={search}
            onSearchChange={onSearchChange}
            onStatusChange={onStatusChange}
            onPaymentStatusChange={onPaymentStatusChange}
            initialCategory={initialCategory}
            initialStatus={initialStatus}
          />
        </div>

        <div className="flex items-center gap-2">
          <DatePicker.RangePicker
            value={selectedRange}
            onChange={(d) => setSelectedRange(d)}
            allowClear
            className="w-80"
          />
          {exportAllowed ? (
            <Dropdown
              menu={{
                items: [
                  { key: "csv", label: t.admin.orderExportAsCsv, onClick: () => handleExport("csv") },
                  { key: "xlsx", label: t.admin.orderExportAsExcel, onClick: () => handleExport("xlsx") },
                ],
                disabled: exportingCsv,
              }}
              trigger={["click"]}
            >
              <Button type="primary" loading={exportingCsv}>
                {exportingCsv ? t.admin.orderExporting : t.admin.orderDownloadCsv}
              </Button>
            </Dropdown>
          ) : (
            <Popover
              content={<ExportUpsell />}
              trigger="click"
              placement="bottomRight"
              styles={{ container: { padding: 12, borderRadius: 14 } }}
            >
              <Button icon={<LockOutlined />} className="text-gray-400 dark:text-gray-500">
                {t.admin.orderDownloadCsv}
              </Button>
            </Popover>
          )}
        </div>
      </div>

      <DataTable<StoreOrder>
        columns={columns}
        data={orders}
        loading={loading}
        rowKey={(record) => record.id}
        rowSelection={{
          selectedRowKeys,
          onChange: onSelectChange,
          selections: [
            {
              key: "all",
              text: t.admin.orderSelectAll,
              onSelect: () => {
                setSelectedRowKeys(orders.map((order) => order.id));
              },
            },
            {
              key: "none",
              text: t.admin.orderClearAll,
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-3 bg-gray-50 dark:bg-gray-600 rounded">
                <div>
                  <span className="text-sm font-medium text-gray-300">
                    {t.admin.orderDeliveryOption}
                  </span>
                  <div className="font-medium capitalize">
                    {order.delivery_option || t.admin.orderNotSet}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-300">
                    {t.admin.orderPaymentMethodOption}
                  </span>
                  <div className="font-medium capitalize">
                    {order.payment_method === "cod"
                      ? t.admin.orderCod
                      : order.payment_method || t.admin.orderNotSet}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-300">
                    {t.admin.orderStatusOption}{" "}
                  </span>
                  <StatusTag status={order.status as OrderStatus} />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-300">
                    {t.admin.orderPaymentStatusOption}{" "}
                  </span>
                  <StatusTag status={order.payment_status as PaymentStatus} />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-300">
                    {t.admin.orderDeliveryCourierOption}
                  </span>
                  <div className="font-medium capitalize">
                    {order.courier || t.admin.orderNotSet}
                  </div>
                </div>
              </div>

              {order.status !== OrderStatus.CANCELLED &&
                !(order.status === OrderStatus.DELIVERED && order.payment_status === PaymentStatus.PAID) && (
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
                  onSaveCourier={(c) =>
                    onUpdate(order.id, { courier: c })
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
                  onSavePathaoShipment={(consignmentId, orderStatus) =>
                    onUpdate(order.id, {
                      courier_consignment_id: consignmentId,
                      courier_order_status: orderStatus,
                    })
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
      {/* Mobile pagination */}
      <div className="flex flex-col items-center gap-2 mt-4 md:hidden">
        {/* Show total items */}
        <div className="text-sm text-gray-600">
          {`${n(Math.min((page - 1) * pageSize + 1, total))}-${n(Math.min(page * pageSize, total))} ${t.admin.orderOf} ${n(total)} ${t.admin.orderItemsLabel}`}
        </div>

        {/* Previous / Next buttons */}
        <div className="flex gap-2">
          <Button
            size="small"
            disabled={page === 1}
            onClick={() => onTableChange({ current: page - 1, pageSize })}
          >
            {t.admin.orderPrevBtn}
          </Button>
          <span className="text-sm">
            {t.admin.orderPageOf} {n(page)} {t.admin.orderOf} {n(Math.ceil(total / pageSize) || 1)}
          </span>
          <Button
            size="small"
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => onTableChange({ current: page + 1, pageSize })}
          >
            {t.admin.orderNextBtn}
          </Button>
        </div>
      </div>

      <div className="mt-4 justify-end hidden md:flex">
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger
          onChange={(p, ps) => onTableChange({ current: p, pageSize: ps })}
          pageSizeOptions={["5", "10", "20", "50"]}
          showTotal={(total, range) =>
            `${n(range[0])}-${n(range[1])} ${t.admin.orderOf} ${n(total)} ${t.admin.orderItemsLabel}`
          }
        />
      </div>

      {/* Invoice Modal */}
      {showInvoice && selectedOrderForInvoice && storeData && (
        <InvoiceModal
          open={showInvoice}
          onClose={() => {
            setShowInvoice(false);
            setSelectedOrderForInvoice(null);
          }}
          store={{
            name: storeData.store_name,
            address: storeData.business_address,
            phone: storeData.contact_phone,
            email: storeData.contact_email,
          }}
          orderId={selectedOrderForInvoice.order_number}
          customer={{
            name: getCustomerName(selectedOrderForInvoice),
            contact: getCustomerPhone(selectedOrderForInvoice),
            address: getFullAddress(selectedOrderForInvoice),
          }}
          products={selectedOrderForInvoice.order_items.map((item) => ({
            name: item.product_name,
            qty: item.quantity,
            price: item.unit_price,
          }))}
          currency={getValidCurrency(selectedOrderForInvoice.currency)}
          subtotal={selectedOrderForInvoice.subtotal}
          deliveryCharge={selectedOrderForInvoice.shipping_fee}
          taxAmount={selectedOrderForInvoice.tax_amount}
          discountAmount={selectedOrderForInvoice.discount_amount}
          // ✅ FIX 1: Convert number to AdditionalCharge array
          additionalCharges={
            selectedOrderForInvoice.additional_charges &&
            selectedOrderForInvoice.additional_charges > 0
              ? [
                  {
                    label: "Additional Charges",
                    amount: selectedOrderForInvoice.additional_charges,
                  },
                ]
              : []
          }
          totalDue={selectedOrderForInvoice.total_amount}
          paymentStatus={selectedOrderForInvoice.payment_status}
          paymentMethod={selectedOrderForInvoice.payment_method ?? undefined}
          orderStatus={selectedOrderForInvoice.status}
          // ✅ FIX 2: Pass notes from order
          notes={selectedOrderForInvoice.notes ?? ""}
          orderCreatedAt={selectedOrderForInvoice.created_at}
          showPOSButton={false}
        />
      )}
    </div>
  );
};

export default OrdersTable;
