"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Tag, Table, Spin, App } from "antd";
import { ExclamationCircleOutlined, DownloadOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { getVendorOrderById } from "@/lib/queries/vendorOrder/getVendorOrderById";
import { confirmVendorOrder } from "@/lib/queries/vendorOrder/confirmVendorOrder";
import { deleteVendorOrder } from "@/lib/queries/vendorOrder/deleteVendorOrder";
import { getStoreById } from "@/lib/queries/stores/getStoreById";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import type { VendorOrder, VendorOrderItem, VendorOrderStatus } from "@/lib/types/vendor/type";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";

const STATUS_COLORS: Record<VendorOrderStatus, string> = {
  draft: "gold",
  confirmed: "green",
  cancelled: "red",
};

export default function VendorOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const router = useRouter();
  const { storeId, user } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, "vendor_flow");
  const { success, error } = useSheiNotification();
  const { modal } = App.useApp();

  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await getVendorOrderById(orderId, storeId);
      setOrder(data);
    } finally {
      setLoading(false);
    }
  }, [orderId, storeId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleConfirm = () => {
    modal.confirm({
      title: "Confirm this vendor order?",
      icon: <ExclamationCircleOutlined />,
      content:
        "This will move stock out of the warehouse into the vendor's stock. This cannot be undone from here.",
      okText: "Confirm & Dispatch",
      onOk: async () => {
        setConfirming(true);
        try {
          await confirmVendorOrder(orderId, user?.id ?? null);
          success("Vendor order confirmed — stock transferred");
          fetchOrder();
        } catch (err) {
          error(err instanceof Error ? err.message : "Failed to confirm order");
        } finally {
          setConfirming(false);
        }
      },
    });
  };

  const handleDelete = () => {
    modal.confirm({
      title: "Delete this draft order?",
      icon: <ExclamationCircleOutlined />,
      content: "This draft has not moved any stock yet. This cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!storeId) return;
        setDeleting(true);
        try {
          const ok = await deleteVendorOrder(orderId, storeId);
          if (ok) {
            success("Draft deleted");
            router.push("/dashboard/vendor-orders");
          } else {
            error("Failed to delete draft");
          }
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const handleDownloadDocument = async () => {
    if (!order || !storeId) return;
    setDownloading(true);
    try {
      const store = await getStoreById(storeId);
      const res = await fetch("/api/vendor-invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store: {
            name: store?.store_name ?? "Store",
            address: store?.business_address,
            phone: store?.contact_phone,
            email: store?.contact_email,
          },
          vendor: {
            name: order.vendor?.name,
            phone: order.vendor?.phone,
            address: order.vendor?.address,
          },
          invoiceNumber: order.invoice_number,
          orderDate: dayjs(order.order_date).format("DD MMM YYYY"),
          docType: order.status === "draft" ? "quotation" : "invoice",
          items: (order.items ?? []).map((i) => ({
            name: i.product_name,
            sku: i.sku,
            qty: i.quantity,
            vendorTp: Number(i.vendor_tp),
            mrp: i.mrp != null ? Number(i.mrp) : null,
          })),
          subtotal: Number(order.subtotal),
          deliveryCost: Number(order.delivery_cost),
          discountAmount: Number(order.discount_amount),
          grandTotal: Number(order.grand_total),
          paidAmount: Number(order.paid_amount),
          dueAmount: Number(order.due_amount),
          deliveryDate: order.delivery_date ? dayjs(order.delivery_date).format("DD MMM YYYY") : null,
          deliveryPerson: order.delivery_person,
          vehicleNumber: order.vehicle_number,
          referenceNumber: order.reference_number,
          notes: order.notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate document");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const docLabel = order.status === "draft" ? "quotation" : "invoice";
      a.download = `vendor_${docLabel}_${order.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to download document");
    } finally {
      setDownloading(false);
    }
  };

  const columns: ColumnsType<VendorOrderItem> = [
    { title: "Product", dataIndex: "product_name", key: "product_name" },
    { title: "SKU", dataIndex: "sku", key: "sku", width: 120, render: (v) => v || "—" },
    { title: "Qty", dataIndex: "quantity", key: "quantity", width: 70 },
    {
      title: "Original TP",
      dataIndex: "original_tp",
      key: "original_tp",
      width: 100,
      render: (v: number) => Number(v).toFixed(2),
    },
    {
      title: "Incr. %",
      dataIndex: "increase_percent",
      key: "increase_percent",
      width: 80,
      render: (v: number) => `${v}%`,
    },
    {
      title: "Vendor TP",
      dataIndex: "vendor_tp",
      key: "vendor_tp",
      width: 100,
      render: (v: number) => Number(v).toFixed(2),
    },
    {
      title: "MRP",
      dataIndex: "mrp",
      key: "mrp",
      width: 90,
      render: (v: number | null) => (v != null ? Number(v).toFixed(2) : "—"),
    },
    {
      title: "Line Total",
      dataIndex: "line_total",
      key: "line_total",
      width: 110,
      render: (v: number) => Number(v).toFixed(2),
    },
  ];

  if (loading || featureLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!allowed) {
    return <FeatureLocked />;
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-gray-400">
        Vendor order not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white m-0">
                {order.invoice_number}
              </h1>
              <Tag color={STATUS_COLORS[order.status]} className="rounded-full capitalize">
                {order.status}
              </Tag>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
              {order.vendor?.name} · {dayjs(order.order_date).format("DD MMM YYYY")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              icon={<DownloadOutlined />}
              loading={downloading}
              onClick={handleDownloadDocument}
              className="rounded-xl h-9"
            >
              {order.status === "draft" ? "Download Quotation" : "Download Invoice"}
            </Button>
            {order.status === "draft" && (
              <>
                <Button danger loading={deleting} onClick={handleDelete} className="rounded-xl h-9">
                  Delete Draft
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={confirming}
                  onClick={handleConfirm}
                  className="rounded-xl h-9 font-semibold border-none"
                  style={{
                    background: "linear-gradient(135deg, #16a34a, #15803d)",
                    boxShadow: "0 4px 14px rgba(22,163,74,0.4)",
                  }}
                >
                  Confirm & Dispatch
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-6 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-400">Vendor</div>
            <div className="font-semibold text-gray-800 dark:text-gray-100">{order.vendor?.name}</div>
            <div className="text-xs text-gray-500">{order.vendor?.phone}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Delivery</div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {order.delivery_date ? dayjs(order.delivery_date).format("DD MMM YYYY") : "—"}
            </div>
            <div className="text-xs text-gray-500">
              {order.delivery_person || ""} {order.vehicle_number ? `· ${order.vehicle_number}` : ""}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Reference</div>
            <div className="text-sm text-gray-700 dark:text-gray-300">{order.reference_number || "—"}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden overflow-x-auto">
          <Table
            columns={columns}
            dataSource={order.items ?? []}
            rowKey="id"
            pagination={false}
            scroll={{ x: 800 }}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-2 w-full sm:max-w-md sm:ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Quantity</span>
            <span className="font-medium">{order.total_quantity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">{Number(order.subtotal).toFixed(2)}</span>
          </div>
          {Number(order.delivery_cost) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery Cost</span>
              <span className="font-medium">{Number(order.delivery_cost).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Discount</span>
            <span className="font-medium">{Number(order.discount_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-gray-100 dark:border-gray-700 pt-2">
            <span>Grand Total</span>
            <span>{Number(order.grand_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Paid</span>
            <span className="font-medium">{Number(order.paid_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-red-500">
            <span>Due</span>
            <span>{Number(order.due_amount).toFixed(2)}</span>
          </div>
        </div>

        {order.notes && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <div className="text-xs text-gray-400 mb-1">Notes</div>
            <div className="text-sm text-gray-700 dark:text-gray-300">{order.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
