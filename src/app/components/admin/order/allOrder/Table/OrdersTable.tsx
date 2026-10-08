/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  Drawer,
  Grid,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { StoreOrder } from "@/lib/types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import StatusTag from "../StatusFilter/StatusTag";
import OrderProductTable from "./OrderProductTable";
import DetailedOrderView from "../TableData/DetailedOrderView";
import OrdersFilterTabs from "../StatusFilter/OrdersFilterTabs";
import DataTable from "@/app/components/admin/common/DataTable";
import { getValidCurrency } from "@/lib/utils/currency";
import {
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CopyOutlined,
  PrinterOutlined,
  MoreOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import BulkActions from "./BulkActions";
import BulkCourierShipmentAction from "./BulkCourierShipmentAction";
import BulkInvoiceAction from "./BulkInvoiceAction";
import { Check, MapPin, Trash2 } from "lucide-react";
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
import ReceiptPreviewModal from "@/app/components/admin/order/quick-sale/ReceiptPreviewModal";
import { buildReceiptPdfSetForOrder } from "@/lib/utils/receiptFromOrder";
import { sanitizeFilename } from "@/lib/utils/printWindow";
import { resolveOrderInvoiceDate } from "@/lib/utils/orderInvoiceDate";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { OrderBranchTag } from "@/app/components/admin/branches/OrderBranchTag";
import { useBranches } from "@/lib/context/BranchContext";
import { invoiceStoreFor } from "@/lib/utils/invoiceStore";
import { markInvoicesPrinted } from "@/lib/queries/orders/markInvoicesPrinted";
import { ReviewLinkButton } from "./ReviewLinkButton";

import { formatDate, formatDateTime, formatDateTimeShort } from "@/lib/utils/formatDate";
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
  /** Order-date range (YYYY-MM-DD) that filters the list and the export; empty = all dates. */
  dateFrom?: string;
  dateTo?: string;
  onDateRangeChange?: (from: string, to: string) => void;
  /** Extra quick filters (channel, needs-branch…) shown on the left of the filter card's bottom row. */
  filterExtras?: React.ReactNode;
}

// Same re-skin technique as VendorTable.tsx's TABLE_STYLES — uppercase gray
// headers, subtle hover tint, borderless rows — for visual consistency with
// the rest of the dashboard's "modernized antd table" pages.
// "All" loads this many orders at once — every order for most stores, and
// still a quick page for the ones with more (they get a second page).
const ALL_ORDERS_PAGE_SIZE = 500;
const PAGE_SIZE_CHOICES = [10, 20, 50, 100, ALL_ORDERS_PAGE_SIZE];

const TABLE_STYLES = `
  .orders-table .ant-table-thead > tr > th {
    background: #fafafa !important; color: #6b7280 !important;
    font-size: 11px !important; font-weight: 700 !important;
    text-transform: uppercase !important; letter-spacing: 0.06em !important;
    border-bottom: 1px solid #f0f0f5 !important; padding: 10px 16px !important;
  }
  .dark .orders-table .ant-table-thead > tr > th {
    background: #1f2937 !important; color: #9ca3af !important;
    border-bottom-color: #374151 !important;
  }
  .orders-table .ant-table-tbody > tr > td {
    padding: 16px !important; border-bottom: 1px solid #f3f4f6 !important; vertical-align: top !important;
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
  onRefresh,
  onExportOrders,
  dateFrom = "",
  dateTo = "",
  onDateRangeChange,
  filterExtras,
}) => {
  const { notification } = App.useApp();
  const t = useTranslation();
  const n = useLocalNum();
  // The order open in the side drawer (looked up live, so it refreshes after an edit).
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);
  const screens = Grid.useBreakpoint();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] =
    useState<StoreOrder | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Reprint-from-order state (Quick Sale/POS orders only) — rebuilds the
  // thermal receipt PDF entirely from the persisted order, so it works even
  // after the checkout page's in-memory receipt has been lost (reload, tab
  // closed, etc.) — see receiptFromOrder.ts.
  const [receiptOrder, setReceiptOrder] = useState<StoreOrder | null>(null);
  const [receiptBuilding, setReceiptBuilding] = useState(false);
  const [receiptPdfBlob, setReceiptPdfBlob] = useState<Blob | null>(null);
  const [receiptCustomerCopyBlob, setReceiptCustomerCopyBlob] = useState<Blob | null>(null);
  const [receiptShopCopyBlob, setReceiptShopCopyBlob] = useState<Blob | null>(null);
  const [receiptFileName, setReceiptFileName] = useState("");
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);

  const { storeData } = useInvoiceData({
    storeId: selectedOrderForInvoice?.store_id ?? receiptOrder?.store_id,
  });
  // Stores with branches: invoices and receipts print the order's branch.
  const { enabled: branchesOn, branches, branchFileSuffix } = useBranches();
  const orderBranch = useCallback(
    (branchId?: string | null) => (branchesOn ? (branches.find((b) => b.id === branchId) ?? null) : null),
    [branchesOn, branches],
  );

  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<StoreOrder | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    currency: storeCurrency,
    icon: currencyIconRaw,
    loading: currencyIconLoading,
  } = useUserCurrencyIcon();
  // Same "only BDT is an active currency today" simplification QuickSale.tsx
  // makes — icon is typed ReactNode for currencies that render as a
  // component, but the receipt PDF needs a plain string.
  const currencyIcon =
    !currencyIconLoading && typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";

  const { storeId } = useCurrentUser();
  const { allowed: exportAllowed } = useFeatureGate(storeId, "export_data");
  const { can } = usePermissions();

  // const handleSearchChange = (value: string) => setSearchOrderId(value);

  const handleEdit = (order: StoreOrder) => {
    const params = new URLSearchParams(searchParams.toString());
    const returnUrl = `${pathname}?${params.toString()}`;
    router.push(
      `/dashboard/orders/edit-order/${order.order_number}?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  };

  const handleDelete = (order: StoreOrder) => {
    if (order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.RETURNED) {
      notification.warning({
        title: t.admin.orderCannotDeleteTitle,
        description: `Order #${order.order_number} is "${order.status}". Please cancel or mark the order returned first to restore stock before deleting.`,
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
      const result = await dataService.deleteOrder(orderId);
      if (!result.success) {
        notification.error({
          title: t.admin.orderDeleteFailed,
          description: result.error || "Failed to delete order. Please try again.",
        });
        return;
      }

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

  const handlePrintReceipt = (order: StoreOrder) => {
    setReceiptOrder(order);
  };

  // Waits for storeData to resolve to *this* order's store (it's keyed off
  // selectedOrderForInvoice/receiptOrder — whichever is set) before building,
  // so a reprint never uses another store's stale name/logo left over from a
  // previously-opened invoice.
  useEffect(() => {
    if (!receiptOrder || !storeData || storeData.id !== receiptOrder.store_id) return;
    let cancelled = false;
    setReceiptBuilding(true);
    buildReceiptPdfSetForOrder(
      receiptOrder,
      storeData,
      paidAmountByOrderId[receiptOrder.id] ?? 0,
      currencyIcon,
      orderBranch(receiptOrder.branch_id),
    )
      .then(({ combined, customerCopy, shopCopy }) => {
        if (cancelled) return;
        setReceiptPdfBlob(combined);
        setReceiptCustomerCopyBlob(customerCopy);
        setReceiptShopCopyBlob(shopCopy);
        setReceiptFileName(
          `${sanitizeFilename(`${storeData.store_name}-${receiptOrder.order_number}`)}.pdf`,
        );
        setReceiptPreviewOpen(true);
        setReceiptOrder(null);
      })
      .catch((err) => {
        if (cancelled) return;
        notification.error({
          title: "Couldn't rebuild receipt",
          description: err instanceof Error ? err.message : undefined,
        });
        setReceiptOrder(null);
      })
      .finally(() => {
        if (!cancelled) setReceiptBuilding(false);
      });
    return () => {
      cancelled = true;
    };
  }, [receiptOrder, storeData, paidAmountByOrderId, currencyIcon, notification, orderBranch]);

  // Bulk selection handlers
  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys as string[]);
  };

  const handleBulkUpdateSuccess = () => {
    setSelectedRowKeys([]);
  };

  const ORDER_EXPORT_HEADER = [
    "Order #",
    "Order Date",
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
      // order_date is the date shown on the order (can be backdated); created_at is only a fallback.
      formatDate(o.order_date || o.created_at),
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

    setExportingCsv(true);
    let sourceOrders: StoreOrder[];
    try {
      // Fetch every order matching the current filters — not just the page
      // currently on screen — so the export isn't silently truncated.
      // Already limited to the selected order-date range by the server.
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

    const targetOrders = sourceOrders;

    if (!targetOrders || targetOrders.length === 0) {
      notification.info({
        title: t.admin.orderNoOrders,
        description: t.admin.orderNoOrdersDate,
      });
      setExportingCsv(false);
      return;
    }

    const datePart = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : "all-dates";

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
        XLSX.writeFile(wb, `orders${branchFileSuffix}_${datePart}.xlsx`);
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
        a.download = `orders${branchFileSuffix}_${datePart}.csv`;
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

  // Quick Sale (POS) orders only — every other order type has no thermal
  // receipt to reprint, just the regular invoice above.
  const renderReceiptButton = (order: StoreOrder) =>
    order.channel === "pos" && (
      <Tooltip title="Print Receipt">
        <Button
          type="text"
          icon={<PrinterOutlined />}
          loading={receiptBuilding && receiptOrder?.id === order.id}
          onClick={(e) => {
            e.stopPropagation();
            handlePrintReceipt(order);
          }}
          className={`${ACTION_CHIP_BASE} bg-linear-to-b from-amber-50 to-amber-100/80 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200/70 dark:border-amber-800/40 text-amber-600! dark:text-amber-400! hover:from-amber-100 hover:to-amber-200/80 dark:hover:from-amber-900/60 dark:hover:to-amber-800/40`}
        />
      </Tooltip>
    );

  const renderInvoiceCell = (order: StoreOrder) => (
    <div className="flex items-center justify-center gap-1.5">
      {renderInvoiceButton(order)}
      {renderReceiptButton(order)}
    </div>
  );

  const renderActionButtons = (order: StoreOrder) => {
    const menuItems = [
      ...(can("orders.edit")
        ? [{ key: "edit", icon: <EditOutlined />, label: t.admin.orderEditAction, onClick: () => handleEdit(order) }]
        : []),
      ...(can("orders.delete")
        ? [
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: t.admin.orderDeleteAction,
              danger: true,
              disabled: deleteLoading === order.id,
              onClick: () => handleDelete(order),
            },
          ]
        : []),
    ];
    return (
      <div className="flex items-center justify-center gap-1.5">
        {order.status === OrderStatus.DELIVERED && (
          <ReviewLinkButton
            order={order}
            className={`${ACTION_CHIP_BASE} bg-linear-to-b from-amber-50 to-amber-100/80 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200/70 dark:border-amber-800/40 text-amber-600! dark:text-amber-400! hover:from-amber-100 hover:to-amber-200/80 dark:hover:from-amber-900/60 dark:hover:to-amber-800/40`}
          />
        )}
        {menuItems.length > 0 && (
          <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
            <Button
              type="text"
              aria-label={t.admin.orderMoreActions}
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
              className={`${ACTION_CHIP_BASE} border-border bg-card text-muted-foreground!`}
            />
          </Dropdown>
        )}
      </div>
    );
  };

  const formatCurrency = (amount: number, currency?: string | null) => {
    const finalCurrency = currency || storeCurrency || "";
    return `${finalCurrency} ${n(amount.toFixed(2))}`;
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

  // Quick Sale walk-ins have no real name/phone — show one plain "Walk-in".
  const isWalkIn = (order: StoreOrder) => {
    const phone = getCustomerPhone(order);
    return order.channel === "pos" && (!phone || phone === "N/A" || phone === "No phone");
  };

  /** "Cat Food 1.3kg x2 +1 more" — what's in the order at a glance. */
  const itemsSummary = (order: StoreOrder) => {
    const items = order.order_items ?? [];
    if (items.length === 0) return "—";
    const first = `${items[0].product_name} x${items[0].quantity}`;
    return items.length > 1 ? `${first} ${t.admin.ordersMoreItems.replace("{n}", String(items.length - 1))}` : first;
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
              <span className="truncate font-semibold">#{orderNumber}</span>
              <CopyOutlined className="opacity-0 group-hover:opacity-100 text-xs shrink-0" />
            </span>
          </Tooltip>
          <span className="text-[11px] text-muted-foreground">
            {formatDateTimeShort(resolveOrderInvoiceDate(order.order_date, order.created_at))}
          </span>
          <div className="flex flex-wrap gap-1">
          {order.channel === "pos" && (
            <Tag color="gold" style={{ marginInlineEnd: 0 }}>
              {t.admin.menuQuickSale}
            </Tag>
          )}
          <OrderBranchTag
            branchId={order.branch_id}
            needsTransfer={order.needs_transfer}
            confirmed={order.branch_confirmed}
          />
          {order.invoice_printed_at && (
            <Tooltip title={`${t.admin.printedOn} ${formatDateTime(order.invoice_printed_at)}`}>
              <Tag color="purple" style={{ marginInlineEnd: 0 }}>
                {t.admin.printedTag}
              </Tag>
            </Tooltip>
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
        </div>
      ),
      width: 210,
      fixed: "left" as const,
    },
    {
      title: t.admin.orderColCustomer,
      key: "customer",
      render: (_, order: StoreOrder) =>
        isWalkIn(order) ? (
          <span className="text-sm text-muted-foreground">{t.admin.ordersWalkIn}</span>
        ) : (
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
              <div className="font-medium text-sm truncate max-w-40">
                {getCustomerName(order)}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-40">
                {n(getCustomerPhone(order))}
              </div>
              <div className="mt-1">
                <CustomerOrderHistoryTags
                  history={historyByPhone?.[getCustomerPhone(order)]}
                  showEmptyHint
                />
              </div>
            </div>
          </Space>
        ),
      width: 220,
      responsive: ["md"],
    },
    {
      title: t.admin.ordersColItems,
      key: "items",
      render: (_, order: StoreOrder) => (
        <Tooltip
          title={(order.order_items ?? []).map((i) => `${i.product_name} x${i.quantity}`).join(", ")}
        >
          <span className="text-sm text-foreground line-clamp-3 max-w-72">{itemsSummary(order)}</span>
        </Tooltip>
      ),
      width: 260,
      responsive: ["lg"],
    },
    {
      title: t.admin.orderColTotal,
      key: "total",
      render: (_, order: StoreOrder) => (
        <div className="text-right">
          <div className="font-semibold text-foreground text-sm">
            {formatCurrency(order.total_amount, order.currency)}
          </div>
          {order.shipping_fee > 0 && (
            <div className="text-[11px] text-muted-foreground">
              {t.admin.ordersInclDelivery} {formatCurrency(order.shipping_fee, order.currency)}
            </div>
          )}
          {order.payment_status !== PaymentStatus.PAID &&
            order.status !== OrderStatus.CANCELLED &&
            order.status !== OrderStatus.RETURNED && (
              <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {t.admin.ordersDue}{" "}
                {formatCurrency(
                  Math.max(order.total_amount - (paidAmountByOrderId[order.id] ?? 0), 0),
                  order.currency,
                )}
              </div>
            )}
        </div>
      ),
      width: 130,
      align: "right" as const,
      responsive: ["sm"],
    },
    {
      title: t.admin.orderColStatus,
      key: "status",
      render: (_, order: StoreOrder) => (
        <div className="flex flex-col items-start gap-1">
          <StatusTag status={order.status as OrderStatus} size="small" />
          <StatusTag status={order.payment_status as PaymentStatus} size="small" />
        </div>
      ),
      width: 120,
      responsive: ["sm"],
    },
    {
      title: t.admin.orderColActions,
      key: "actions",
      render: (_, order: StoreOrder) => (
        <div className="flex items-center justify-center gap-1">
          {renderInvoiceCell(order)}
          <div className="w-px h-5 bg-border mx-0.5" />
          {renderActionButtons(order)}
        </div>
      ),
      width: 150,
      align: "center" as const,
      responsive: ["sm"],
    },
  ];

  /** One compact line of delivery / payment facts — status & payment are already on the row. */
  const renderDeliveryStrip = (order: StoreOrder) => {
    const phone = order.shipping_address?.phone;
    const risk = phone ? riskByPhone?.[phone] : undefined;
    const riskStyle = RISK_STYLES[risk?.level ?? "new"];
    const fbStatus = order.fb_purchase_event_status ?? "sent";
    const fbStyle = FB_STATUS_STYLES[fbStatus];
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          <DetailField label={t.admin.orderDeliveryOption}>
            <span className="capitalize">{order.delivery_option || t.admin.orderNotSet}</span>
          </DetailField>
          <DetailField label={t.admin.orderPaymentMethodOption}>
            <span className="capitalize">
              {order.payment_method === "cod" ? t.admin.orderCod : order.payment_method || t.admin.orderNotSet}
            </span>
          </DetailField>
          <DetailField label={t.admin.orderDeliveryCourierOption}>
            <span className="capitalize">{order.courier || t.admin.orderNotSet}</span>
          </DetailField>
          <DetailField label={t.admin.orderColRisk}>
            <Tooltip title={risk?.reason ?? "No history yet"}>
              <span className={`inline-block cursor-help rounded-full px-2 py-0.5 text-xs font-semibold ${riskStyle.bg} ${riskStyle.text}`}>
                {riskStyle.label}
              </span>
            </Tooltip>
          </DetailField>
          <DetailField label={t.admin.orderColFb}>
            <Tooltip title={fbStyle.reason}>
              <span className={`inline-flex cursor-help items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${fbStyle.bg} ${fbStyle.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${fbStyle.dot}`} />
                {fbStyle.label}
              </span>
            </Tooltip>
          </DetailField>
        </div>
      </div>
    );
  };

  // ✅ FIXED: Mobile card renderer with proper address display
  const renderOrderCard = (order: StoreOrder) => {
    const displayAddress = getDisplayAddress(order);
    const fullAddress = getFullAddress(order);

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
                {formatDateTimeShort(resolveOrderInvoiceDate(order.order_date, order.created_at))}
              </div>
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                <Tag color={order.channel === "pos" ? "gold" : "blue"} style={{ marginInlineEnd: 0 }}>
                  {order.channel === "pos" ? "Quick Sale" : "Online"}
                </Tag>
                <OrderBranchTag
                  branchId={order.branch_id}
                  needsTransfer={order.needs_transfer}
                  confirmed={order.branch_confirmed}
                />
                {order.invoice_printed_at && (
                  <Tag color="purple" style={{ marginInlineEnd: 0 }}>
                    {t.admin.printedTag}
                  </Tag>
                )}
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
                {isWalkIn(order) ? t.admin.ordersWalkIn : getCustomerName(order)}
              </div>
              {!isWalkIn(order) && (
                <div className="text-xs text-muted-foreground truncate">
                  {n(getCustomerPhone(order))}
                </div>
              )}
              <div className="text-xs text-foreground/80 truncate mt-0.5">{itemsSummary(order)}</div>
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
              {renderInvoiceCell(order)}
              <div className="w-px h-5 bg-border mx-0.5" />
              {renderActionButtons(order)}
            </div>
          </div>

          {/* Details open in the side drawer */}
          <button
            onClick={() => setDrawerOrderId(order.id)}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 sm:text-sm dark:text-indigo-400 dark:hover:bg-indigo-950/30"
          >
            {t.admin.orderViewDetails}
            <RightOutlined className="text-[10px]" />
          </button>
        </div>

      </Card>
    );
  };

  return (
    <div className={selectedRowKeys.length > 0 ? "pb-40 sm:pb-24" : undefined}>
      {/* Bulk actions — float at the bottom while orders are ticked. */}
      {selectedRowKeys.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-4xl rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-card/95 backdrop-blur shadow-2xl p-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 text-center sm:text-left whitespace-nowrap">
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
                onPrinted={() => onRefresh?.()}
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

      <div className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-4">
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2">{filterExtras}</div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <DatePicker.RangePicker format="DD-MM-YYYY"
            value={dateFrom && dateTo ? [dayjs(dateFrom), dayjs(dateTo)] : null}
            onChange={(d) =>
              onDateRangeChange?.(
                d?.[0] && d?.[1] ? d[0].format("YYYY-MM-DD") : "",
                d?.[0] && d?.[1] ? d[1].format("YYYY-MM-DD") : "",
              )
            }
            allowClear
            className="w-full sm:w-72"
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
      </div>

      <style>{TABLE_STYLES}</style>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
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
        onRow={(record) => ({
          onClick: (e) => {
            // Buttons, links and checkboxes inside a row do their own thing.
            if ((e.target as HTMLElement).closest("button, a, input, .ant-checkbox-wrapper, .ant-dropdown-trigger, .ant-dropdown")) return;
            // Selecting text to copy (a phone number, say) isn't a request to open the order.
            if (window.getSelection()?.toString()) return;
            setDrawerOrderId(record.id);
          },
          style: { cursor: "pointer" },
        })}
        scroll={{ x: 1000 }}
        responsive={true}
        renderCard={renderOrderCard}
        cardBreakpoint="lg"
      />
      </div>
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
          showSizeChanger={{
            options: PAGE_SIZE_CHOICES.map((size) => ({
              value: size,
              label: size === ALL_ORDERS_PAGE_SIZE ? t.admin.ordersShowAllPerPage : `${n(size)} / ${t.admin.ordersPerPage}`,
            })),
          }}
          onChange={(p, ps) => onTableChange({ current: p, pageSize: ps })}
          showTotal={(total, range) =>
            `${n(range[0])}-${n(range[1])} ${t.admin.orderOf} ${n(total)} ${t.admin.orderItemsLabel}`
          }
        />
      </div>

      {/* Order drawer — the list stays put while one order is worked on. */}
      {(() => {
        const index = orders.findIndex((o) => o.id === drawerOrderId);
        const order = index >= 0 ? orders[index] : null;
        const isFinalizedOrder =
          !!order &&
          (order.status === OrderStatus.CANCELLED ||
            order.status === OrderStatus.RETURNED ||
            (order.status === OrderStatus.DELIVERED && order.payment_status === PaymentStatus.PAID));
        return (
          <Drawer
            open={!!order}
            onClose={() => setDrawerOrderId(null)}
            size={screens.lg ? 760 : "100%"}
            destroyOnHidden
            title={
              order && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">#{order.order_number}</span>
                  <Tooltip title={t.admin.orderCopied}>
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyOrderNumber(order.order_number)}
                    />
                  </Tooltip>
                </div>
              )
            }
            extra={
              <div className="flex items-center gap-1">
                <Tooltip title={t.admin.orderPrevOrder}>
                  <Button
                    size="small"
                    icon={<LeftOutlined />}
                    disabled={index <= 0}
                    onClick={() => setDrawerOrderId(orders[index - 1].id)}
                  />
                </Tooltip>
                <Tooltip title={t.admin.orderNextOrder}>
                  <Button
                    size="small"
                    icon={<RightOutlined />}
                    disabled={index < 0 || index >= orders.length - 1}
                    onClick={() => setDrawerOrderId(orders[index + 1].id)}
                  />
                </Tooltip>
              </div>
            }
          >
            {order && (
              <div className="space-y-4">
                {/* Who, how much, where it stands */}
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {isWalkIn(order) ? t.admin.ordersWalkIn : getCustomerName(order)}
                      </div>
                      {!isWalkIn(order) && (
                        <div className="text-xs text-muted-foreground">{n(getCustomerPhone(order))}</div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDateTimeShort(resolveOrderInvoiceDate(order.order_date, order.created_at))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold tabular-nums text-foreground">
                        {formatCurrency(order.total_amount, order.currency)}
                      </div>
                      <div className="mt-1.5 flex flex-wrap justify-end gap-1">
                        <StatusTag status={order.status as OrderStatus} size="small" />
                        <StatusTag status={order.payment_status as PaymentStatus} size="small" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                    {order.channel === "pos" && <Tag color="gold" style={{ marginInlineEnd: 0 }}>{t.admin.menuQuickSale}</Tag>}
                    <OrderBranchTag
                      branchId={order.branch_id}
                      needsTransfer={order.needs_transfer}
                      confirmed={order.branch_confirmed}
                    />
                    {order.invoice_printed_at && (
                      <Tag color="purple" style={{ marginInlineEnd: 0 }}>{t.admin.printedTag}</Tag>
                    )}
                    {!isWalkIn(order) && (
                      <CustomerOrderHistoryTags history={historyByPhone?.[getCustomerPhone(order)]} showEmptyHint />
                    )}
                    <div className="ml-auto flex items-center gap-1.5">
                      {renderInvoiceCell(order)}
                      {renderActionButtons(order)}
                    </div>
                  </div>
                </div>

                {/* The work: status, payment, courier, collect payment (hidden once the order is finished) */}
                {!isFinalizedOrder && (
                  <OrderProductTable
                    // Keyed by order id: the drawer's prev/next buttons swap
                    // `order` without closing the drawer, so without this the
                    // courier form keeps the previous order's recipient name,
                    // phone, address and COD amount — and would ship them.
                    key={order.id}
                    order={order}
                    onSaveStatus={(st: OrderStatus) => onUpdate(order.id, { status: st })}
                    onSavePaymentStatus={(st: PaymentStatus) => onUpdate(order.id, { payment_status: st })}
                    onSaveDeliveryOption={(o) => onUpdate(order.id, { delivery_option: o })}
                    onSavePaymentMethod={(m) => onUpdate(order.id, { payment_method: m })}
                    onSaveCourier={(c) => onUpdate(order.id, { courier: c })}
                    onSaveShippingFee={(fee) =>
                      onUpdate(order.id, {
                        shipping_fee: fee,
                        total_amount: order.subtotal + order.tax_amount + fee,
                      })
                    }
                    onSaveCancelNote={(note) => onUpdate(order.id, { notes: note })}
                    onSavePathaoShipment={(consignmentId, orderStatus) =>
                      onUpdate(order.id, {
                        courier_consignment_id: consignmentId,
                        courier_order_status: orderStatus,
                      })
                    }
                    onRefresh={onRefresh}
                  />
                )}

                {renderDeliveryStrip(order)}
                <DetailedOrderView order={order} paidAmount={paidAmountByOrderId[order.id] ?? 0} />
              </div>
            )}
          </Drawer>
        );
      })()}

      {/* Invoice Modal */}
      {showInvoice && selectedOrderForInvoice && storeData && (
        <InvoiceModal
          open={showInvoice}
          onClose={() => {
            setShowInvoice(false);
            setSelectedOrderForInvoice(null);
          }}
          store={invoiceStoreFor(storeData, orderBranch(selectedOrderForInvoice.branch_id))}
          onPrinted={() => {
            const printedId = selectedOrderForInvoice.id;
            markInvoicesPrinted([printedId]).then((res) => {
              if (res.ok && res.count > 0) onRefresh?.();
            });
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
          // Quick Sale's delivery option is always the fixed in-store "shop"
          // pickup — showing it on the invoice would just be noise, so it's
          // only passed for a regular (non-POS) order.
          deliveryOption={
            selectedOrderForInvoice.channel === "pos"
              ? null
              : selectedOrderForInvoice.delivery_option
          }
          orderStatus={selectedOrderForInvoice.status}
          // ✅ FIX 2: Pass notes from order
          notes={selectedOrderForInvoice.notes ?? ""}
          // The order's own (admin-settable) date drives the invoice date —
          // created_at is only a fallback for rows without one.
          orderCreatedAt={resolveOrderInvoiceDate(
            selectedOrderForInvoice.order_date,
            selectedOrderForInvoice.created_at,
          )}
          showPOSButton={false}
        />
      )}

      {/* Reprinted Quick Sale receipt */}
      <ReceiptPreviewModal
        open={receiptPreviewOpen}
        pdfBlob={receiptPdfBlob}
        customerCopyBlob={receiptCustomerCopyBlob}
        shopCopyBlob={receiptShopCopyBlob}
        fileName={receiptFileName}
        onClose={() => setReceiptPreviewOpen(false)}
      />

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
