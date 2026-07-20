"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  InputNumber,
  Input,
  Select,
  Space,
  Table,
  Spin,
  Tag,
  Divider,
  Alert,
} from "antd";
import { DeleteOutlined, PlusOutlined, HistoryOutlined } from "@ant-design/icons";
import { PackagePlus } from "lucide-react";

import type { ColumnsType } from "antd/es/table";
import { useParams, useRouter } from "next/navigation";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useLocalDraft } from "@/lib/hook/useLocalDraft";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { getVendorOrderById } from "@/lib/queries/vendorOrder/getVendorOrderById";
import { getVendorOrderableProducts } from "@/lib/queries/vendorOrder/getVendorOrderableProducts";
import { addItemsToConfirmedOrder } from "@/lib/queries/vendorOrder/addItemsToConfirmedOrder";
import type {
  VendorOrder,
  VendorOrderItem,
  VendorOrderableProduct,
  VendorOrderItemInput,
} from "@/lib/types/vendor/type";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";

interface DraftLineItem extends VendorOrderItemInput {
  key: string;
  warehouse_stock: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function AddItemsToVendorOrderPage() {
  const params = useParams();
  const orderId = params.id as string;
  const router = useRouter();

  const { storeId, user, loading: userLoading } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, "vendor_flow");
  const { success, error } = useSheiNotification();

  const [pageLoading, setPageLoading] = useState(true);
  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [newItems, setNewItems, clearDraft, hasDraft] = useLocalDraft<DraftLineItem[]>(
    `vendor_order_add_items_${orderId}`,
    [],
  );
  const [productOptions, setProductOptions] = useState<VendorOrderableProduct[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    if (!storeId || userLoading) return;
    const load = async () => {
      setPageLoading(true);
      try {
        const o = await getVendorOrderById(orderId, storeId);

        if (!o) {
          error("Vendor order not found");
          router.push("/dashboard/vendor-orders");
          return;
        }
        if (o.status !== "confirmed") {
          error("Only confirmed orders can have items added");
          router.push(`/dashboard/vendor-orders/${orderId}`);
          return;
        }

        const products = await getVendorOrderableProducts(storeId, "");

        setOrder(o);
        setProductOptions(products);
      } catch (err) {
        error(err instanceof Error ? err.message : "Failed to load order");
      } finally {
        setPageLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, userLoading, orderId]);

  const searchProducts = useCallback(
    async (term: string) => {
      if (!storeId) return;
      const requestId = ++searchRequestIdRef.current;
      setProductSearchLoading(true);
      try {
        const rows = await getVendorOrderableProducts(storeId, term);
        if (requestId !== searchRequestIdRef.current) return;
        setProductOptions(rows);
      } finally {
        if (requestId === searchRequestIdRef.current) setProductSearchLoading(false);
      }
    },
    [storeId],
  );

  const handleProductSearch = useCallback(
    (term: string) => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => searchProducts(term), 300);
    },
    [searchProducts],
  );

  const addProduct = (value: string) => {
    const [productId, variantId] = value.split("::");
    const row = productOptions.find(
      (p) => p.product_id === productId && (p.variant_id ?? "") === (variantId ?? ""),
    );
    if (!row) return;

    setNewItems((prev) => {
      const existing = prev.find(
        (i) => i.product_id === row.product_id && (i.variant_id ?? "") === (row.variant_id ?? ""),
      );
      if (existing) {
        return prev.map((i) =>
          i.key === existing.key ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      const displayName = row.variant_name
        ? `${row.product_name} — ${row.variant_name}`
        : row.product_name;
      return [
        ...prev,
        {
          key: `${row.product_id}::${row.variant_id ?? ""}`,
          product_id: row.product_id,
          variant_id: row.variant_id,
          product_name: displayName,
          sku: row.sku,
          quantity: 1,
          original_tp: row.tp_price,
          increase_percent: 0,
          vendor_tp: row.tp_price,
          mrp: row.base_price || null,
          warehouse_stock: row.warehouse_stock,
        },
      ];
    });
  };

  const updateItem = (key: string, patch: Partial<DraftLineItem>) => {
    setNewItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const next = { ...item, ...patch };
        if (patch.increase_percent !== undefined) {
          next.vendor_tp = round2(
            next.original_tp + (next.original_tp * next.increase_percent) / 100,
          );
        }
        return next;
      }),
    );
  };

  const removeItem = (key: string) =>
    setNewItems((prev) => prev.filter((i) => i.key !== key));

  const addedSubtotal = useMemo(
    () => round2(newItems.reduce((sum, i) => sum + i.quantity * i.vendor_tp, 0)),
    [newItems],
  );
  const addedQuantity = useMemo(
    () => newItems.reduce((sum, i) => sum + i.quantity, 0),
    [newItems],
  );
  const newGrandTotal = useMemo(
    () =>
      round2(
        Number(order?.subtotal ?? 0) +
          addedSubtotal +
          Number(order?.delivery_cost ?? 0) -
          Number(order?.discount_amount ?? 0),
      ),
    [order, addedSubtotal],
  );
  const newDueAmount = useMemo(
    () => round2(newGrandTotal - Number(order?.paid_amount ?? 0)),
    [newGrandTotal, order],
  );

  const existingColumns: ColumnsType<VendorOrderItem> = [
    { title: "Product", dataIndex: "product_name", key: "product_name" },
    { title: "SKU", dataIndex: "sku", key: "sku", width: 110, render: (v) => v || "—" },
    { title: "Qty", dataIndex: "quantity", key: "quantity", width: 70 },
    {
      title: "Original TP",
      dataIndex: "original_tp",
      key: "original_tp",
      width: 100,
      render: (v: number) => Number(v).toFixed(2),
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

  const newColumns: ColumnsType<DraftLineItem> = [
    {
      title: "Product",
      key: "product",
      render: (_, record) => (
        <div>
          <div className="font-medium text-gray-800 dark:text-gray-100">{record.product_name}</div>
          <div className="text-xs text-gray-400">
            {record.sku ? `SKU: ${record.sku} · ` : ""}Warehouse stock: {record.warehouse_stock}
          </div>
        </div>
      ),
    },
    {
      title: "Qty",
      key: "quantity",
      width: 100,
      render: (_, record) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(v) => updateItem(record.key, { quantity: v ?? 1 })}
          className="w-full rounded-lg"
          status={record.quantity > record.warehouse_stock ? "warning" : undefined}
        />
      ),
    },
    {
      title: "Original TP",
      dataIndex: "original_tp",
      key: "original_tp",
      width: 100,
      render: (v: number) => v.toFixed(2),
    },
    {
      title: "Increase TP (%)",
      key: "increase_percent",
      width: 130,
      render: (_, record) => (
        <Space.Compact className="w-full">
          <InputNumber
            min={0}
            value={record.increase_percent}
            onChange={(v) => updateItem(record.key, { increase_percent: v ?? 0 })}
            className="w-full"
          />
          <Input value="%" readOnly style={{ width: 38 }} />
        </Space.Compact>
      ),
    },
    {
      title: "Vendor TP",
      key: "vendor_tp",
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.vendor_tp}
          onChange={(v) => updateItem(record.key, { vendor_tp: v ?? 0 })}
          className="w-full rounded-lg"
        />
      ),
    },
    {
      title: "MRP (Optional)",
      key: "mrp",
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.mrp ?? undefined}
          onChange={(v) => updateItem(record.key, { mrp: v ?? null })}
          className="w-full rounded-lg"
          placeholder="—"
        />
      ),
    },
    {
      title: "Line Total",
      key: "line_total",
      width: 110,
      render: (_, record) => round2(record.quantity * record.vendor_tp).toFixed(2),
    },
    {
      title: "",
      key: "actions",
      width: 40,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.key)}
        />
      ),
    },
  ];

  const handleSave = async () => {
    if (newItems.length === 0) {
      error("Add at least one product");
      return;
    }
    setSaving(true);
    try {
      await addItemsToConfirmedOrder(
        orderId,
        newItems.map(({ key: _k, warehouse_stock: _s, ...rest }) => rest),
        user?.id ?? null,
      );
      clearDraft();
      success("Products added and stock dispatched");
      router.push(`/dashboard/vendor-orders/${orderId}`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to add products");
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || featureLoading || pageLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!allowed) return <FeatureLocked />;
  if (!order) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-400 to-purple-600 flex items-center justify-center">
            <PackagePlus size={20} color="white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white m-0">
                Add Products — {order.invoice_number}
              </h1>
              <Tag color="green" className="rounded-full">confirmed</Tag>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
              {order.vendor?.name} · New items are dispatched to the vendor immediately
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-6 max-w-5xl mx-auto">

        {/* Existing items — read-only */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 m-0">
              Previously Dispatched
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {order.items?.length ?? 0} items · Qty {order.total_quantity}
            </span>
          </div>
          <Table
            columns={existingColumns}
            dataSource={order.items ?? []}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ x: 700 }}
            className="opacity-70"
          />
        </div>

        <Divider className="my-2!">
          <span className="text-xs text-gray-400">Add new products below</span>
        </Divider>

        {hasDraft && newItems.length > 0 && (
          <Alert
            type="info"
            icon={<HistoryOutlined />}
            showIcon
            message="Draft restored"
            description="Your unsaved products were recovered from your last session."
            action={
              <Button size="small" danger onClick={clearDraft}>
                Clear
              </Button>
            }
            className="rounded-xl"
          />
        )}

        {/* New items picker */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-indigo-200 dark:border-indigo-700 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 m-0">
            New Products to Dispatch
          </h2>
          <Select
            showSearch
            value={null}
            placeholder="Search and add a product"
            filterOption={false}
            onSearch={handleProductSearch}
            onChange={addProduct}
            loading={productSearchLoading}
            options={productOptions.map((p) => ({
              value: `${p.product_id}::${p.variant_id ?? ""}`,
              label: p.variant_name ? `${p.product_name} — ${p.variant_name}` : p.product_name,
            }))}
            className="w-full"
            suffixIcon={<PlusOutlined />}
          />
          <Table
            columns={newColumns}
            dataSource={newItems}
            rowKey="key"
            pagination={false}
            locale={{ emptyText: "No new products added yet" }}
            scroll={{ x: 900 }}
          />
        </div>

        {/* Updated totals preview */}
        {newItems.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-2 w-full sm:max-w-md sm:ml-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide m-0">
              Updated Order Totals
            </p>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Previous subtotal</span>
              <span>{Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <span>+ New items ({addedQuantity} qty)</span>
              <span>+{addedSubtotal.toFixed(2)}</span>
            </div>
            {Number(order.delivery_cost) > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivery cost</span>
                <span>{Number(order.delivery_cost).toFixed(2)}</span>
              </div>
            )}
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Discount</span>
                <span>−{Number(order.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-gray-100 dark:border-gray-700 pt-2">
              <span>New Grand Total</span>
              <span>{newGrandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Paid</span>
              <span>{Number(order.paid_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-red-500">
              <span>New Due</span>
              <span>{newDueAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            onClick={() => router.push(`/dashboard/vendor-orders/${orderId}`)}
            className="rounded-xl h-10"
          >
            Cancel
          </Button>
          <Button
            type="primary"
            loading={saving}
            disabled={newItems.length === 0}
            onClick={handleSave}
            className="rounded-xl h-10 font-semibold border-none"
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
            }}
          >
            Dispatch & Add to Order
          </Button>
        </div>
      </div>
    </div>
  );
}
