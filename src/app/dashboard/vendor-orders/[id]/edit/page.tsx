"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Select,
  Space,
  DatePicker,
  InputNumber,
  Input,
  Table,
  Modal,
  Alert,
  Spin,
} from "antd";
import { DeleteOutlined, PlusOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { PackagePlus } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { useParams, useRouter } from "next/navigation";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { getVendorDashboardStats } from "@/lib/queries/vendor/getVendorDashboardStats";
import { getVendorOrderableProducts } from "@/lib/queries/vendorOrder/getVendorOrderableProducts";
import { getVendorOrderById } from "@/lib/queries/vendorOrder/getVendorOrderById";
import { updateVendorOrder } from "@/lib/queries/vendorOrder/updateVendorOrder";
import type { VendorOrderableProduct, VendorOrderItemInput } from "@/lib/types/vendor/type";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";

interface DraftLineItem extends VendorOrderItemInput {
  key: string;
  warehouse_stock: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function EditVendorOrderPage() {
  const params = useParams();
  const orderId = params.id as string;
  const router = useRouter();

  const { storeId, loading: userLoading } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, "vendor_flow");
  const { success, error } = useSheiNotification();

  const [pageLoading, setPageLoading] = useState(true);
  const [vendorName, setVendorName] = useState("");
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorCurrentDue, setVendorCurrentDue] = useState(0);
  const [orderDate, setOrderDate] = useState<Dayjs>(dayjs());
  const [invoiceDate, setInvoiceDate] = useState<Dayjs | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Dayjs | null>(null);
  const [deliveryPerson, setDeliveryPerson] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);

  const [items, setItems] = useState<DraftLineItem[]>([]);
  const [productOptions, setProductOptions] = useState<VendorOrderableProduct[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef(0);

  // Load existing order on mount
  useEffect(() => {
    if (!storeId || userLoading) return;

    const load = async () => {
      setPageLoading(true);
      try {
        const order = await getVendorOrderById(orderId, storeId);

        if (!order) {
          error("Vendor order not found");
          router.push("/dashboard/vendor-orders");
          return;
        }

        if (order.status !== "draft") {
          error("Only draft orders can be edited");
          router.push(`/dashboard/vendor-orders/${orderId}`);
          return;
        }

        const products = await getVendorOrderableProducts(storeId, "");

        setProductOptions(products);
        setVendorId(order.vendor_id);
        setVendorName(order.vendor?.name ?? "");
        setOrderDate(dayjs(order.order_date));
        setInvoiceDate(order.invoice_date ? dayjs(order.invoice_date) : null);
        setDeliveryDate(order.delivery_date ? dayjs(order.delivery_date) : null);
        setDeliveryPerson(order.delivery_person ?? "");
        setVehicleNumber(order.vehicle_number ?? "");
        setReferenceNumber(order.reference_number ?? "");
        setNotes(order.notes ?? "");
        setDeliveryCost(Number(order.delivery_cost) || 0);
        setDiscountAmount(Number(order.discount_amount) || 0);
        setPaidAmount(Number(order.paid_amount) || 0);

        // Build warehouse_stock map from product options
        const stockMap = new Map(
          products.map((p) => [`${p.product_id}::${p.variant_id ?? ""}`, p.warehouse_stock]),
        );

        const draftItems: DraftLineItem[] = (order.items ?? []).map((item) => {
          const key = `${item.product_id}::${item.variant_id ?? ""}`;
          return {
            key,
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_name: item.product_name,
            sku: item.sku,
            quantity: item.quantity,
            original_tp: Number(item.original_tp),
            increase_percent: Number(item.increase_percent),
            vendor_tp: Number(item.vendor_tp),
            mrp: item.mrp != null ? Number(item.mrp) : null,
            warehouse_stock: stockMap.get(key) ?? 0,
          };
        });

        setItems(draftItems);

        if (order.vendor_id) {
          getVendorDashboardStats(order.vendor_id).then((stats) =>
            setVendorCurrentDue(stats.current_due - Number(order.due_amount)),
          );
        }
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

    setItems((prev) => {
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
    setItems((prev) =>
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

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const totalQuantity = useMemo(
    () => items.reduce((sum, i) => sum + (i.quantity || 0), 0),
    [items],
  );
  const subtotal = useMemo(
    () => round2(items.reduce((sum, i) => sum + (i.quantity || 0) * (i.vendor_tp || 0), 0)),
    [items],
  );
  const grandTotal = useMemo(
    () => round2(subtotal + (deliveryCost || 0) - (discountAmount || 0)),
    [subtotal, deliveryCost, discountAmount],
  );
  const dueAmount = useMemo(
    () => round2(grandTotal - (paidAmount || 0)),
    [grandTotal, paidAmount],
  );
  const projectedVendorDue = useMemo(
    () => round2(vendorCurrentDue + dueAmount),
    [vendorCurrentDue, dueAmount],
  );

  const columns: ColumnsType<DraftLineItem> = [
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

  const handleSave = () => {
    if (items.length === 0) {
      error("Add at least one product");
      return;
    }
    performSave();
  };

  const performSave = async () => {
    if (!storeId || !vendorId) return;
    setSaving(true);
    try {
      await updateVendorOrder({
        order_id: orderId,
        store_id: storeId,
        order_date: orderDate.format("YYYY-MM-DD"),
        invoice_date: invoiceDate ? invoiceDate.format("YYYY-MM-DD") : null,
        delivery_date: deliveryDate ? deliveryDate.format("YYYY-MM-DD") : null,
        delivery_person: deliveryPerson || undefined,
        vehicle_number: vehicleNumber || undefined,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
        delivery_cost: deliveryCost,
        discount_amount: discountAmount,
        paid_amount: paidAmount,
        items: items.map(({ key: _key, warehouse_stock: _stock, ...rest }) => rest),
      });
      success("Vendor order updated");
      router.push(`/dashboard/vendor-orders/${orderId}`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to update vendor order");
    } finally {
      setSaving(false);
    }
  };

  const productSelectOptions = productOptions.map((p) => ({
    value: `${p.product_id}::${p.variant_id ?? ""}`,
    label: p.variant_name ? `${p.product_name} — ${p.variant_name}` : p.product_name,
  }));

  if (userLoading || featureLoading || pageLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!allowed) return <FeatureLocked />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-400 to-purple-600 flex items-center justify-center">
            <PackagePlus size={20} color="white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white m-0">Edit Vendor Order</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
              {vendorName} · Draft — changes will not move stock until confirmed
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-6 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 m-0">Order Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Vendor</label>
              <div className="mt-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                {vendorName}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Order Date</label>
              <DatePicker
                value={orderDate}
                onChange={(d) => d && setOrderDate(d)}
                className="w-full mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Invoice Date (Optional)</label>
              <DatePicker
                value={invoiceDate}
                onChange={setInvoiceDate}
                className="w-full mt-1"
              />
            </div>
          </div>
        </div>

        {projectedVendorDue < 0 && (
          <Alert
            type="info"
            showIcon
            message="Vendor credit balance"
            description={`This vendor has a credit balance of ${Math.abs(projectedVendorDue).toFixed(2)} after this update.`}
            className="rounded-xl"
          />
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 m-0">Products</h2>
          <Select
            showSearch
            value={null}
            placeholder="Search and add a product"
            filterOption={false}
            onSearch={handleProductSearch}
            onChange={addProduct}
            loading={productSearchLoading}
            options={productSelectOptions}
            className="w-full"
            suffixIcon={<PlusOutlined />}
          />
          <Table
            columns={columns}
            dataSource={items}
            rowKey="key"
            pagination={false}
            locale={{ emptyText: "No products added yet" }}
            scroll={{ x: 900 }}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 m-0">Additional Information (Optional)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Delivery Date</label>
              <DatePicker value={deliveryDate} onChange={setDeliveryDate} className="w-full mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Delivery Person</label>
              <Input value={deliveryPerson} onChange={(e) => setDeliveryPerson(e.target.value)} className="mt-1 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Vehicle Number</label>
              <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} className="mt-1 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Reference Number</label>
              <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="mt-1 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Notes</label>
            <Input.TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 rounded-lg" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-3 w-full sm:max-w-md sm:ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Quantity</span>
            <span className="font-medium">{totalQuantity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Delivery Cost</span>
            <InputNumber
              min={0}
              value={deliveryCost}
              onChange={(v) => setDeliveryCost(v ?? 0)}
              className="w-32 rounded-lg"
              placeholder="0"
            />
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Discount</span>
            <InputNumber
              min={0}
              value={discountAmount}
              onChange={(v) => setDiscountAmount(v ?? 0)}
              className="w-32 rounded-lg"
            />
          </div>
          <div className="flex justify-between text-base font-bold border-t border-gray-100 dark:border-gray-700 pt-3">
            <span>Grand Total</span>
            <span>{grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Paid Amount</span>
            <InputNumber
              min={0}
              value={paidAmount}
              onChange={(v) => setPaidAmount(v ?? 0)}
              className="w-32 rounded-lg"
            />
          </div>
          <div className="flex justify-between text-sm font-semibold text-red-500">
            <span>Due Amount</span>
            <span>{dueAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => router.push(`/dashboard/vendor-orders/${orderId}`)} className="rounded-xl h-10">
            Cancel
          </Button>
          <Button
            type="primary"
            loading={saving}
            onClick={handleSave}
            className="rounded-xl h-10 font-semibold border-none"
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
            }}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
