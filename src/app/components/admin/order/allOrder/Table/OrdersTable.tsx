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
  Tag,
  Modal,
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
  CopyOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import BulkActions from "./BulkActions";
import BulkCourierShipmentAction from "./BulkCourierShipmentAction";
import BulkInvoiceAction from "./BulkInvoiceAction";
import { Check, MapPin, ChevronDown, Trash2 } from "lucide-react";
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
import CustomerOrderHistoryTags from "@/app/components/admin/order/common/CustomerOrderHistoryTags";
import type { CustomerHistoryEntry } from "@/lib/types/orders/customerHistory";

interface Props {
  orders: StoreOrder[];
  paidAmountByOrderId?: Record<string, number>;
  riskByPhone?: Record<string, RiskAssessment>;
  historyByPhone?: Record<string, CustomerHistoryEntry[]>;
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
  totalByChannel?: { online: number; pos: number };
  channelFilter?: "all" | "online" | "pos";
  onChannelChange?: (channel: "all" | "online" | "pos") => void;
  onRefresh?: () => void;
  onExportOrders?: () => Promise<StoreOrder[]>;
}

// Same re-skin technique as VendorTable.tsx's TABLE_STYLES — uppercase gray
// headers, subtle hover tint, borderless rows — for visual consistency with
// the rest of the dashboard's "modernized antd table" pages.
const TABLE_STYLES = `
  .orders-table .ant-table-thead > tr > th {
    background: #fafafa !important; color: #6b7280 !important;
    font-size: 11px !important; font-weight: 700 !important;
    text-transform: uppercase !important; letter-spacing: 0.06em !important;
    border-bottom: 1px solid #f0f0f5 !important; padding: 12px 16px !important;
  }
  .dark .orders-table .ant-table-thead > tr > th {
    background: #1f2937 !important; color: #9ca3af !important;
    border-bottom-color: #374151 !important;
  }
  .orders-table .ant-table-tbody > tr > td {
    padding: 12px 16px !important; border-bottom: 1px solid #f9fafb !important;
  }
  .dark .orders-table .ant-table-tbody > tr > td { border-bottom-color: #374151 !important; }
  .orders-table .ant-table-tbody > tr:hover > td { background: #fafbff !important; }
  .dark .orders-table .ant-table-tbody > tr:hover > td { background: #1e293b !important; }
  .orders-table .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
`;

// Label + value pair used throughout the expand panel's detail strip — one
// shared, theme-aware style instead of each field repeating its own
// (the old `text-gray-300` label color barely showed up on a light
// background at all).
const DetailField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className,
}) => (
  <div className={className}>
    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
      {label}
    </div>
    <div className="text-sm font-medium text-foreground">{children}</div>
  </div>
);

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
  paidAmountByOrderId = {},
  riskByPhone,
  historyByPhone,
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
  totalByChannel = { online: 0, pos: 0 },
  channelFilter = "all",
  onChannelChange,
  onRefresh,
  onExportOrders,
}) => {
  const { notification } = App.useApp();
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
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<StoreOrder | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    currency: storeCurrency,
    // icon: currencyIcon,
    // loading: currencyLoading,
  } = useUserCurrencyIcon();

  const { storeId } = useCurrentUser();
  const { allowed: exportAllowed } = useFeatureGate(storeId, "export_data");

  // const handleSearchChange = (value: string) => setSearchOrderId(value);

  const handleEdit = (order: StoreOrder) => {
    const params = new URLSearchParams(searchParams.toString());
    const returnUrl = `${pathname}?${params.toString()}`;
    router.push(
      `/dashboard/orders/edit-order/${order.order_number}?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  };

  const handleDelete = (order: StoreOrder) => {
    if (order.status !== OrderStatus.CANCELLED) {
      notification.warning({
        title: t.admin.orderCannotDeleteTitle,
        description: `Order #${order.order_number} is "${order.status}". Please cancel the order first to restore stock before deleting.`,
        duration: 4,
      });
      return;
    }

    setDeleteConfirmOrder(order);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmOrder) return;
    await performDelete(deleteConfirmOrder.id);
    setDeleteConfirmOrder(null);
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

  // Consolidates what used to be a dedicated Invoice column plus separate
  // Edit/Delete icon buttons into one menu — frees up column width and
  // matches the row-action-menu pattern common in modern admin tables.
  // Glossy tinted chip look shared by the invoice/edit/delete row buttons —
  // a soft top-to-bottom gradient + hairline border + shadow that lifts
  // slightly on hover, so each action reads as its own small "premium"
  // control instead of a flat gray icon.
  const ACTION_CHIP_BASE =
    "!w-8 !h-8 !min-w-8 !p-0 !rounded-lg !inline-flex !items-center !justify-center border shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 transition-all duration-150";

  const renderInvoiceButton = (order: StoreOrder) => (
    <Tooltip title="View Invoice">
      <Button
        type="text"
        icon={<FileTextOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          handleViewInvoice(order);
        }}
        className={`${ACTION_CHIP_BASE} bg-linear-to-b from-indigo-50 to-indigo-100/80 dark:from-indigo-950/50 dark:to-indigo-900/30 border-indigo-200/70 dark:border-indigo-800/40 text-indigo-600! dark:text-indigo-400! hover:from-indigo-100 hover:to-indigo-200/80 dark:hover:from-indigo-900/60 dark:hover:to-indigo-800/40`}
      />
    </Tooltip>
  );

  const renderActionButtons = (order: StoreOrder) => (
    <div className="flex items-center justify-center gap-1.5">
      <Tooltip title="Edit Order">
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(order);
          }}
          className={`${ACTION_CHIP_BASE} bg-linear-to-b from-blue-50 to-blue-100/80 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200/70 dark:border-blue-800/40 text-blue-600! dark:text-blue-400! hover:from-blue-100 hover:to-blue-200/80 dark:hover:from-blue-900/60 dark:hover:to-blue-800/40`}
        />
      </Tooltip>
      <Tooltip title="Delete Order">
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          loading={deleteLoading === order.id}
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(order);
          }}
          className={`${ACTION_CHIP_BASE} bg-linear-to-b from-rose-50 to-rose-100/80 dark:from-rose-950/50 dark:to-rose-900/30 border-rose-200/70 dark:border-rose-800/40 text-rose-600! dark:text-rose-400! hover:from-rose-100 hover:to-rose-200/80 dark:hover:from-rose-900/60 dark:hover:to-rose-800/40`}
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
      render: (orderNumber: string, order: StoreOrder) => (
        <div className="flex flex-col items-start gap-0.5 max-w-full overflow-hidden">
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
          {order.channel === "pos" && (
            <Tag color="gold" style={{ marginInlineEnd: 0 }}>
              POS
            </Tag>
          )}
          {(paidAmountByOrderId[order.id] ?? 0) > 0 &&
            order.payment_status !== PaymentStatus.PAID && (
              <Tooltip title="Part of this order has already been paid — the rest is still outstanding">
                <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                  Advance {n(paidAmountByOrderId[order.id].toFixed(0))}
                </Tag>
              </Tooltip>
            )}
        </div>
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
            <div className="font-medium text-sm truncate max-w-25 lg:max-w-37.5">
              {getCustomerName(order)}
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-25 lg:max-w-37.5">
              {n(getCustomerPhone(order))}
            </div>
          </div>
        </Space>
      ),
      width: 170,
      responsive: ["md"],
    },
    {
      title: "Channel",
      key: "channel",
      render: (_, order: StoreOrder) =>
        order.channel === "pos" ? (
          <Tag color="gold" style={{ marginInlineEnd: 0 }}>
            Quick Sale
          </Tag>
        ) : (
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            Online
          </Tag>
        ),
      width: 100,
      responsive: ["sm"],
    },
    {
      title: t.admin.orderColTotal,
      key: "total",
      render: (_, order: StoreOrder) => (
        <div className="text-right">
          <div className="font-semibold text-foreground text-sm">
            {formatCurrency(order.total_amount, order.currency)}
          </div>
          <div className="text-xs text-muted-foreground">
            Ship: {formatCurrency(order.shipping_fee, order.currency)}
          </div>
          {order.tax_amount != null && order.tax_amount > 0 && (
            <div className="text-xs text-muted-foreground">
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
      title: "Invoice",
      key: "invoice",
      render: (_, order: StoreOrder) => renderInvoiceButton(order),
      width: 64,
      align: "center" as const,
      responsive: ["sm"],
    },
    {
      title: t.admin.orderColActions,
      key: "actions",
      render: (_, order: StoreOrder) => renderActionButtons(order),
      width: 76,
      align: "center" as const,
      responsive: ["sm"],
    },
  ];

  // ✅ FIXED: Mobile card renderer with proper address display
  const renderOrderCard = (order: StoreOrder) => {
    const displayAddress = getDisplayAddress(order);
    const fullAddress = getFullAddress(order);

    const isExpanded = expandedRowKey === order.id;
    const isSelected = selectedRowKeys.includes(order.id);

    return (
      <Card
        key={order.id}
        className="mb-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-border relative overflow-hidden"
        style={{ padding: 0 }}
      >
        <div className="p-3.5 sm:p-4">
          {/* Checkbox in top-right corner */}
          <div className="absolute top-3.5 right-3.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRowKeys([...selectedRowKeys, order.id]);
                } else {
                  setSelectedRowKeys(
                    selectedRowKeys.filter((key) => key !== order.id),
                  );
                }
              }}
              className="h-4 w-4 rounded border-border text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Header */}
          <div className="flex justify-between items-start mb-3 pr-6">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-indigo-600 dark:text-indigo-400 text-base sm:text-lg truncate">
                #{order.order_number}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                {formatDate(order.created_at)}
              </div>
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                <Tag color={order.channel === "pos" ? "gold" : "blue"} style={{ marginInlineEnd: 0 }}>
                  {order.channel === "pos" ? "Quick Sale" : "Online"}
                </Tag>
                {(paidAmountByOrderId[order.id] ?? 0) > 0 &&
                  order.payment_status !== PaymentStatus.PAID && (
                    <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                      Advance {n(paidAmountByOrderId[order.id].toFixed(0))}
                    </Tag>
                  )}
              </div>
            </div>
            <div className="text-right ml-2">
              <div className="font-bold text-base sm:text-lg whitespace-nowrap text-foreground">
                {formatCurrency(order.total_amount, order.currency)}
              </div>
              <div className="text-xs text-muted-foreground">
                {t.admin.orderShippingLabel} {formatCurrency(order.shipping_fee, order.currency)}
              </div>
            </div>
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="flex items-center gap-1 mb-2.5 text-indigo-600 dark:text-indigo-400 text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg">
              <Check size={12} />
              {t.admin.orderSelectedForBulk}
            </div>
          )}

          {/* Customer Info */}
          <div className="flex items-center mb-3">
            <Avatar
              size="small"
              style={{
                backgroundColor: "#4f46e5",
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
              <div className="font-semibold text-sm text-foreground truncate">
                {getCustomerName(order)}
              </div>

              <div className="text-xs text-muted-foreground truncate">
                {n(getCustomerPhone(order))}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="mb-3 flex items-start gap-1.5 text-xs sm:text-sm text-muted-foreground">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <Tooltip title={fullAddress}>
              <span className="line-clamp-2">{displayAddress}</span>
            </Tooltip>
          </div>

          {/* Status Tags + Actions — delivery option/payment method/risk/
              history/FB status all moved to "View Details" below, same as
              the desktop table, instead of duplicating them here. */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <StatusTag status={order.status as OrderStatus} size="small" />
              <StatusTag
                status={order.payment_status as PaymentStatus}
                size="small"
              />
            </div>
            <div className="flex items-center gap-1">
              {renderInvoiceButton(order)}
              <div className="w-px h-5 bg-border mx-0.5" />
              {renderActionButtons(order)}
            </div>
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setExpandedRowKey(isExpanded ? null : order.id)}
            className="mt-2 w-full flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-xs sm:text-sm font-semibold py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
          >
            {isExpanded ? t.admin.orderHideDetails : t.admin.orderViewDetails}
            <ChevronDown
              size={14}
              className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 -mt-1 bg-muted/30 pt-3">
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
              <BulkInvoiceAction
                selectedOrders={selectedOrderObjects}
                storeId={storeId ?? undefined}
                paidAmountByOrderId={paidAmountByOrderId}
                getCustomerName={getCustomerName}
                getCustomerPhone={getCustomerPhone}
                getFullAddress={getFullAddress}
                exportAllowed={exportAllowed}
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

      {onChannelChange && (
        <div className="mb-3 flex items-center gap-1.5">
          {(
            [
              ["all", "All Channels", totalByChannel.online + totalByChannel.pos],
              ["online", "Online", totalByChannel.online],
              ["pos", "Quick Sale", totalByChannel.pos],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => onChannelChange(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                channelFilter === key
                  ? "bg-indigo-500 border-indigo-500 text-white"
                  : "bg-card border-border text-muted-foreground hover:border-indigo-400 hover:text-indigo-600"
              }`}
            >
              {label}
              <span
                className={`inline-flex items-center justify-center min-w-4.5 h-4 px-1 rounded-full text-[10px] font-bold ${
                  channelFilter === key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {n(count)}
              </span>
            </button>
          ))}
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

        <div className="flex flex-wrap items-center gap-2">
          <DatePicker.RangePicker
            value={selectedRange}
            onChange={(d) => setSelectedRange(d)}
            allowClear
            className="w-full sm:w-80"
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
              <Button icon={<LockOutlined />} className="text-muted-foreground">
                {t.admin.orderDownloadCsv}
              </Button>
            </Popover>
          )}
        </div>
      </div>

      <style>{TABLE_STYLES}</style>
      <DataTable<StoreOrder>
        className="orders-table"
        bordered={false}
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
          expandedRowRender: (order: StoreOrder) => {
            const phone = order.shipping_address?.phone;
            const risk = phone ? riskByPhone?.[phone] : undefined;
            const riskStyle = RISK_STYLES[risk?.level ?? "new"];
            const fbStatus = order.fb_purchase_event_status ?? "sent";
            const fbStyle = FB_STATUS_STYLES[fbStatus];
            const fullAddress = getFullAddress(order);

            return (
            <div className="space-y-4 p-3 sm:p-4 rounded-xl bg-muted/30">
              {/* Show backend values at the top */}
              <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Order Details
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-4">
                  <DetailField label={t.admin.orderDeliveryOption}>
                    <span className="capitalize">
                      {order.delivery_option || t.admin.orderNotSet}
                    </span>
                  </DetailField>
                  <DetailField label={t.admin.orderPaymentMethodOption}>
                    <span className="capitalize">
                      {order.payment_method === "cod"
                        ? t.admin.orderCod
                        : order.payment_method || t.admin.orderNotSet}
                    </span>
                  </DetailField>
                  <DetailField label={t.admin.orderStatusOption}>
                    <StatusTag status={order.status as OrderStatus} />
                  </DetailField>
                  <DetailField label={t.admin.orderPaymentStatusOption}>
                    <StatusTag status={order.payment_status as PaymentStatus} />
                  </DetailField>
                  <DetailField label={t.admin.orderDeliveryCourierOption}>
                    <span className="capitalize">
                      {order.courier || t.admin.orderNotSet}
                    </span>
                  </DetailField>
                  <DetailField label={t.admin.orderColRisk}>
                    <Tooltip title={risk?.reason ?? "No history yet"}>
                      <span
                        className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full cursor-help ${riskStyle.bg} ${riskStyle.text}`}
                      >
                        {riskStyle.label}
                      </span>
                    </Tooltip>
                  </DetailField>
                  <DetailField label="History">
                    <CustomerOrderHistoryTags
                      history={phone ? historyByPhone?.[phone] : undefined}
                      currentOrderId={order.id}
                      showEmptyHint
                    />
                  </DetailField>
                  <DetailField label={t.admin.orderColFb}>
                    <Tooltip title={fbStyle.reason}>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full cursor-help ${fbStyle.bg} ${fbStyle.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${fbStyle.dot}`} />
                        {fbStyle.label}
                      </span>
                    </Tooltip>
                  </DetailField>
                  <DetailField
                    label={t.admin.orderColAddress}
                    className="col-span-2 sm:col-span-3 lg:col-span-4"
                  >
                    <span className="font-normal">{fullAddress}</span>
                  </DetailField>
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
            );
          },
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
          amountPaid={paidAmountByOrderId[selectedOrderForInvoice.id]}
          paymentStatus={selectedOrderForInvoice.payment_status}
          paymentMethod={selectedOrderForInvoice.payment_method ?? undefined}
          orderStatus={selectedOrderForInvoice.status}
          // ✅ FIX 2: Pass notes from order
          notes={selectedOrderForInvoice.notes ?? ""}
          orderCreatedAt={selectedOrderForInvoice.created_at}
          showPOSButton={false}
        />
      )}

      {/* Delete confirmation */}
      <Modal
        open={!!deleteConfirmOrder}
        onCancel={() => setDeleteConfirmOrder(null)}
        footer={null}
        width={420}
        centered
      >
        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-400 to-red-600 flex items-center justify-center mb-4">
            <Trash2 size={22} color="white" strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1.5">
            Delete Order?
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Are you sure you want to delete order{" "}
            <span className="font-semibold text-foreground">
              #{deleteConfirmOrder?.order_number}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex gap-2 w-full">
            <Button
              className="flex-1"
              onClick={() => setDeleteConfirmOrder(null)}
              disabled={deleteLoading === deleteConfirmOrder?.id}
            >
              {t.admin.orderDeleteCancel}
            </Button>
            <Button
              danger
              type="primary"
              className="flex-1"
              loading={deleteLoading === deleteConfirmOrder?.id}
              onClick={confirmDelete}
            >
              {t.admin.orderDeleteOk}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrdersTable;
