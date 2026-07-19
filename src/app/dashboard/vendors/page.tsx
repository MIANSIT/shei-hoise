"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button, Pagination, Input, Spin } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Users, Wallet, PackageCheck, HandCoins, TrendingUp, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

import { getVendors } from "@/lib/queries/vendor/getVendors";
import { getVendorsSummaryByIds } from "@/lib/queries/vendor/getVendorsSummaryByIds";
import { getVendorsOverviewStats } from "@/lib/queries/vendor/getVendorsOverviewStats";
import { createVendor, type CreateVendorInput } from "@/lib/queries/vendor/createVendor";
import { updateVendor, type UpdateVendorInput } from "@/lib/queries/vendor/updateVendor";
import { deleteVendor } from "@/lib/queries/vendor/deleteVendor";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import type {
  Vendor,
  VendorFormValues,
  VendorListSummary,
  VendorsOverviewStats,
} from "@/lib/types/vendor/type";

import VendorTable from "@/app/components/admin/dashboard/vendors/VendorTable";
import VendorFormModal from "@/app/components/admin/dashboard/vendors/VendorFormModal";
import { VendorStatCard } from "@/app/components/admin/dashboard/vendors/VendorStatCard";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";

type ModalMode = "create" | "edit";
const PAGE_SIZE = 10;

export default function VendorsPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, "vendor_flow");
  const { success, error } = useSheiNotification();
  const router = useRouter();
  const { icon: currencyIcon } = useUserCurrencyIcon();
  const currencySymbol = typeof currencyIcon === "string" ? currencyIcon : "";
  const fmtMoney = useCallback(
    (v: number) => `${currencySymbol ? `${currencySymbol} ` : ""}${Number(v).toFixed(2)}`,
    [currencySymbol],
  );

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<Map<string, VendorListSummary>>(new Map());
  const [overview, setOverview] = useState<VendorsOverviewStats | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  }, []);

  const fetchVendors = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!storeId) return;
      if (!opts?.silent) setLoading(true);
      try {
        const result = await getVendors({
          storeId,
          search: debouncedSearch || undefined,
          page,
          pageSize: PAGE_SIZE,
        });
        setVendors(result.data);
        setTotal(result.total);
        const summaryMap = await getVendorsSummaryByIds(result.data.map((v) => v.id));
        setSummaries(summaryMap);
      } finally {
        setLoading(false);
      }
    },
    [storeId, debouncedSearch, page],
  );

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const fetchOverview = useCallback(async () => {
    if (!storeId) return;
    const stats = await getVendorsOverviewStats(storeId);
    setOverview(stats);
  }, [storeId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingVendor(null);
    setIsModalOpen(true);
  };

  const openEditModal = (vendor: Vendor) => {
    setModalMode("edit");
    setEditingVendor(vendor);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingVendor(null);
  };

  const handleSubmit = async (values: VendorFormValues) => {
    if (!storeId) return;
    setSubmitting(true);
    try {
      if (modalMode === "create") {
        const input: CreateVendorInput = { store_id: storeId, ...values };
        const created = await createVendor(input);
        if (created) {
          success("Vendor added successfully");
          closeModal();
          fetchVendors({ silent: true });
          fetchOverview();
        } else {
          error("Failed to add vendor");
        }
      } else if (editingVendor) {
        const input: UpdateVendorInput = {
          id: editingVendor.id,
          store_id: storeId,
          ...values,
        };
        const updated = await updateVendor(input);
        if (updated) {
          success("Vendor updated successfully");
          closeModal();
          fetchVendors({ silent: true });
        } else {
          error("Failed to update vendor");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!storeId) return;
    setDeletingId(id);
    try {
      const ok = await deleteVendor(id, storeId);
      if (ok) {
        success("Vendor deleted");
        fetchVendors({ silent: true });
        fetchOverview();
      } else {
        error("Could not delete vendor — it may have existing orders. Set it to Inactive instead.");
      }
    } finally {
      setDeletingId(null);
    }
  };

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
              <Users size={20} color="white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white m-0">Vendors</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
                Manage the vendors/resellers you distribute stock to
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push("/dashboard/vendor-orders/create")}
              className="rounded-xl h-9 font-medium"
            >
              New Vendor Order
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
              className="rounded-xl h-9 font-semibold border-none"
              style={{
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
              }}
            >
              Add Vendor
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <VendorStatCard
            icon={<Users size={18} color="white" />}
            label="Active Vendors"
            value={String(overview?.total_vendors ?? 0)}
            accent="linear-gradient(135deg,#6366f1,#4f46e5)"
          />
          <VendorStatCard
            icon={<PackageCheck size={18} color="white" />}
            label="Stock Out With Vendors"
            value={fmtMoney(overview?.total_stock_value ?? 0)}
            accent="linear-gradient(135deg,#f59e0b,#d97706)"
          />
          <VendorStatCard
            icon={<Wallet size={18} color="white" />}
            label="Total Due To Collect"
            value={fmtMoney(overview?.total_due ?? 0)}
            accent="linear-gradient(135deg,#ef4444,#dc2626)"
          />
          <VendorStatCard
            icon={<HandCoins size={18} color="white" />}
            label="Collected This Week"
            value={fmtMoney(overview?.collected_this_week ?? 0)}
            hint={`This month: ${fmtMoney(overview?.collected_this_month ?? 0)}`}
            accent="linear-gradient(135deg,#10b981,#059669)"
          />
          <VendorStatCard
            icon={<TrendingUp size={18} color="white" />}
            label="Margin Dispatched"
            value={fmtMoney(overview?.total_margin_dispatched ?? 0)}
            hint="On confirmed dispatches"
            accent="linear-gradient(135deg,#0ea5e9,#0284c7)"
          />
          <VendorStatCard
            icon={<AlertTriangle size={18} color="white" />}
            label="Slow-Moving Stock"
            value={fmtMoney(overview?.slow_moving_stock_value ?? 0)}
            hint="Unsold 30+ days"
            accent="linear-gradient(135deg,#78716c,#57534e)"
          />
        </div>

        <Input
          placeholder="Search by vendor name, phone, or business name"
          prefix={<SearchOutlined className="text-gray-400" />}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="rounded-xl h-10 max-w-md"
          allowClear
        />

        <VendorTable
          data={vendors}
          loading={loading}
          deletingId={deletingId}
          summaries={summaries}
          currencySymbol={currencySymbol}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />

        {total > PAGE_SIZE && (
          <div className="flex justify-end">
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={total}
              onChange={setPage}
              showSizeChanger={false}
              size="small"
              showTotal={(t) => `${t} vendors`}
            />
          </div>
        )}
      </div>

      <VendorFormModal
        open={isModalOpen}
        mode={modalMode}
        editingVendor={editingVendor}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={closeModal}
      />
    </div>
  );
}
