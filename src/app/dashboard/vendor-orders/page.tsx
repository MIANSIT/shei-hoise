"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Pagination, Input, Select, Tag, Table, Spin } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PackageSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { getVendorOrders } from "@/lib/queries/vendorOrder/getVendorOrders";
import type { VendorOrder, VendorOrderStatus } from "@/lib/types/vendor/type";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<VendorOrderStatus, string> = {
  draft: "gold",
  confirmed: "green",
  cancelled: "red",
};

export default function VendorOrdersPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, "vendor_flow");
  const router = useRouter();

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VendorOrderStatus | null>(null);
  const [page, setPage] = useState(1);

  const fetchOrders = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const result = await getVendorOrders({
        storeId,
        search: search || undefined,
        status,
        page,
        pageSize: PAGE_SIZE,
      });
      setOrders(result.data);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [storeId, search, status, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const columns: ColumnsType<VendorOrder> = [
    { title: "Invoice #", dataIndex: "invoice_number", key: "invoice_number", width: 150 },
    {
      title: "Vendor",
      key: "vendor",
      render: (_, record) => record.vendor?.name ?? "—",
    },
    {
      title: "Order Date",
      dataIndex: "order_date",
      key: "order_date",
      width: 120,
      render: (d: string) => dayjs(d).format("DD MMM YYYY"),
    },
    { title: "Qty", dataIndex: "total_quantity", key: "total_quantity", width: 80 },
    {
      title: "Grand Total",
      dataIndex: "grand_total",
      key: "grand_total",
      width: 120,
      render: (v: number) => Number(v).toFixed(2),
    },
    {
      title: "Due",
      dataIndex: "due_amount",
      key: "due_amount",
      width: 100,
      render: (v: number) => (
        <span className={Number(v) > 0 ? "text-red-500 font-semibold" : "text-gray-400"}>
          {Number(v).toFixed(2)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (s: VendorOrderStatus) => (
        <Tag color={STATUS_COLORS[s]} className="rounded-full capitalize">
          {s}
        </Tag>
      ),
    },
  ];

  if (userLoading || featureLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!allowed) {
    return <FeatureLocked />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-400 to-purple-600 flex items-center justify-center">
              <PackageSearch size={20} color="white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white m-0">Vendor Orders</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
                Stock dispatched to vendors, and their invoices
              </p>
            </div>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/vendor-orders/create")}
            className="rounded-xl h-9 font-semibold border-none"
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
            }}
          >
            New Vendor Order
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search by invoice number"
            prefix={<SearchOutlined className="text-gray-400" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-xl h-10 max-w-xs"
            allowClear
          />
          <Select
            placeholder="All Statuses"
            allowClear
            value={status ?? undefined}
            onChange={(v) => {
              setStatus(v ?? null);
              setPage(1);
            }}
            options={[
              { value: "draft", label: "Draft" },
              { value: "confirmed", label: "Confirmed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            className="w-40"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden overflow-x-auto">
          <Table
            columns={columns}
            dataSource={orders}
            loading={loading}
            rowKey="id"
            pagination={false}
            onRow={(record) => ({
              onClick: () => router.push(`/dashboard/vendor-orders/${record.id}`),
              className: "cursor-pointer",
            })}
            scroll={{ x: 800 }}
          />
        </div>

        {total > PAGE_SIZE && (
          <div className="flex justify-end">
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={total}
              onChange={setPage}
              showSizeChanger={false}
              size="small"
              showTotal={(t) => `${t} orders`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
