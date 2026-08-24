"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button, Pagination, Input, Spin } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Tag as TagIcon } from "lucide-react";

import { getCoupons } from "@/lib/queries/coupons/getCoupons";
import { createCoupon } from "@/lib/queries/coupons/createCoupon";
import { updateCoupon } from "@/lib/queries/coupons/updateCoupon";
import { deleteCoupon } from "@/lib/queries/coupons/deleteCoupon";
import { getCouponLimitStatus, type CouponLimitStatus } from "@/lib/queries/coupons/getCouponLimitStatus";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import type { Coupon } from "@/lib/types/coupon";
import type { CreateCouponType } from "@/lib/schema/coupon.schema";

import CouponTable from "@/app/components/admin/dashboard/marketing/coupons/CouponTable";
import CouponFormModal, {
  type CouponFormValues,
} from "@/app/components/admin/dashboard/marketing/coupons/CouponFormModal";

type ModalMode = "create" | "edit";
const PAGE_SIZE = 10;

function toCreateCouponType(values: CouponFormValues): CreateCouponType {
  return {
    code: values.code,
    discount_type: values.discount_type,
    discount_value: values.discount_value,
    min_order_amount: values.min_order_amount ?? null,
    max_discount_amount: values.max_discount_amount ?? null,
    max_uses: values.max_uses ?? null,
    max_uses_per_customer: values.max_uses_per_customer ?? null,
    starts_at: values.starts_at ? values.starts_at.toISOString() : null,
    ends_at: values.ends_at ? values.ends_at.toISOString() : null,
    is_active: values.is_active,
  };
}

export default function CouponsPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const { success, error } = useSheiNotification();
  const { icon: currencyIcon } = useUserCurrencyIcon();
  const currencySymbol = typeof currencyIcon === "string" ? currencyIcon : "";

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [limitStatus, setLimitStatus] = useState<CouponLimitStatus | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const result = await getCoupons({
        storeId,
        search: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setCoupons(result.data);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [storeId, debouncedSearch, page]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const fetchLimitStatus = useCallback(async () => {
    if (!storeId) return;
    setLimitStatus(await getCouponLimitStatus(storeId));
  }, [storeId]);

  useEffect(() => {
    fetchLimitStatus();
  }, [fetchLimitStatus]);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingCoupon(null);
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setModalMode("edit");
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  const handleSubmit = async (values: CouponFormValues) => {
    if (!storeId) return;
    setSubmitting(true);
    try {
      if (modalMode === "create") {
        await createCoupon(toCreateCouponType(values), storeId);
        success("Coupon created successfully");
        closeModal();
        fetchCoupons();
        fetchLimitStatus();
      } else if (editingCoupon) {
        await updateCoupon(
          { id: editingCoupon.id, ...toCreateCouponType(values) },
          storeId,
        );
        success("Coupon updated successfully");
        closeModal();
        fetchCoupons();
        fetchLimitStatus();
      }
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to save coupon");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!storeId) return;
    setDeletingId(coupon.id);
    try {
      const ok = await deleteCoupon(coupon.id, storeId);
      if (ok) {
        success("Coupon deleted");
        fetchCoupons();
        fetchLimitStatus();
      } else {
        error("Could not delete coupon — it may have already been redeemed. Deactivate it instead.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const atLimit = limitStatus !== null && !limitStatus.allowed;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <TagIcon size={20} color="white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white m-0">Coupons</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
                Discount codes customers can apply at checkout
                {limitStatus && limitStatus.limit !== -1 && (
                  <> &middot; {limitStatus.current} of {limitStatus.limit} active coupons used</>
                )}
              </p>
            </div>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            disabled={atLimit}
            title={atLimit ? `Your plan allows up to ${limitStatus?.limit} active coupons` : undefined}
            className="rounded-xl h-9 font-semibold border-none"
            style={{
              background: "linear-gradient(135deg, #10b981, #0d9488)",
              boxShadow: "0 4px 14px rgba(16,185,129,0.4)",
            }}
          >
            Add Coupon
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-4">
        {atLimit && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            You&apos;ve reached your plan&apos;s limit of {limitStatus?.limit} active coupons. Deactivate an existing
            coupon or upgrade your plan to add more.
          </div>
        )}

        <Input
          placeholder="Search by coupon code"
          prefix={<SearchOutlined className="text-gray-400" />}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="rounded-xl h-10 max-w-md"
          allowClear
        />

        <CouponTable
          data={coupons}
          loading={loading}
          deletingId={deletingId}
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
              showTotal={(t) => `${t} coupons`}
            />
          </div>
        )}
      </div>

      <CouponFormModal
        open={isModalOpen}
        mode={modalMode}
        editingCoupon={editingCoupon}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={closeModal}
      />
    </div>
  );
}
