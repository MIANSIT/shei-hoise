"use client";

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { Edit, Trash2 } from "lucide-react";
import { Modal } from "antd";
import { deleteProduct } from "@/lib/queries/products/deleteProduct";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import Image from "next/image";
import ProductCardLayout from "@/app/components/admin/common/ProductCardLayout";
import type { TablePaginationConfig } from "antd/es/table";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { ProductStatus } from "@/lib/types/enums";

interface ProductTableProps {
  products: ProductWithVariants[];
  loading?: boolean;
  onDeleteSuccess?: () => void;
  pagination?: TablePaginationConfig;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const getLowestBasePrice = (product: ProductWithVariants) => {
  const prices =
    product.product_variants?.map((v) => v.base_price).filter(Boolean) || [];
  return prices.length > 0
    ? Math.min(...(prices as number[]))
    : product.base_price;
};

const getLowestDiscountedPrice = (product: ProductWithVariants) => {
  const prices =
    (product.product_variants
      ?.map((v) => v.discounted_price)
      .filter(Boolean) as number[]) || [];
  return prices.length > 0
    ? Math.min(...prices)
    : product.discounted_price || null;
};

const getProductImage = (record: ProductWithVariants) => {
  const img =
    record.product_images?.find((i) => i.is_primary) ||
    record.product_images?.[0] ||
    record.product_variants
      ?.flatMap((v) => v.product_images || [])
      .find((i) => i.is_primary) ||
    record.product_variants?.flatMap((v) => v.product_images || [])[0];
  return (
    img?.image_url ||
    "https://lizjlqgrurjegmjeujki.supabase.co/storage/v1/object/public/dummyImage/logo.png"
  );
};

// ── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ProductStatus }> = ({ status }) => {
  const config: Record<
    ProductStatus,
    { label: string; dot: string; badge: string }
  > = {
    [ProductStatus.ACTIVE]: {
      label: "Active",
      dot: "bg-emerald-500",
      badge:
        "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    },
    [ProductStatus.DRAFT]: {
      label: "Draft",
      dot: "bg-amber-400",
      badge:
        "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
    },
    [ProductStatus.INACTIVE]: {
      label: "Inactive",
      dot: "bg-red-400",
      badge: "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400",
    },
  };

  const { label, dot, badge } =
    config[status] ?? config[ProductStatus.INACTIVE];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
};

// ── Variant Chip ─────────────────────────────────────────────────────────────

const VariantChip: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
    {label}
  </span>
);

// ── Action Buttons ────────────────────────────────────────────────────────────

const EditButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:border-indigo-300 dark:hover:border-indigo-500 hover:scale-105 active:scale-95 transition-all duration-150"
    aria-label="Edit"
  >
    <Edit className="w-3.5 h-3.5" />
  </button>
);

const DeleteButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 hover:border-red-300 dark:hover:border-red-500 hover:scale-105 active:scale-95 transition-all duration-150"
    aria-label="Delete"
  >
    <Trash2 className="w-3.5 h-3.5" />
  </button>
);

// ── Main Component ────────────────────────────────────────────────────────────

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  loading,
  onDeleteSuccess,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const sheiNotif = useSheiNotification();
  const { icon: currencyIcon, loading: currencyLoading } =
    useUserCurrencyIcon();
  const cur = currencyLoading ? "" : (currencyIcon ?? "৳");

  const handleEdit = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const returnUrl = `${pathname}?${params.toString()}`;
    router.push(
      `/dashboard/products/edit-product/${slug}?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  };

  const showDeleteModal = (id: string) => {
    setDeletingId(id);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(deletingId);
      sheiNotif.success("Product deleted successfully");
      setModalOpen(false);
      setDeletingId(null);
      onDeleteSuccess?.();
    } catch {
      sheiNotif.error("Failed to delete product");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Desktop columns ─────────────────────────────────────────────────────────

  const columns: ColumnsType<ProductWithVariants> = [
    {
      title: "",
      key: "image",
      align: "center",
      width: 60,
      responsive: ["md"],
      render: (_, record) => (
        <div className="w-11 h-11 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 shrink-0">
          <Image
            src={getProductImage(record)}
            alt={record.name}
            width={44}
            height={44}
            className="object-cover w-full h-full"
          />
        </div>
      ),
    },
    {
      title: "Product",
      key: "name",
      render: (_, record) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100 leading-tight">
            {record.name}
          </span>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {record.category?.name || "Uncategorized"}
          </span>
        </div>
      ),
    },
    {
      title: "Variants",
      key: "variants",
      width: 220,
      responsive: ["md"],
      render: (_, record) => {
        const vars = record.product_variants || [];
        if (!vars.length)
          return (
            <span className="text-xs text-gray-300 dark:text-slate-600 italic">
              No variants
            </span>
          );
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <VariantChip
              label={`${vars[0].variant_name ?? "Unnamed"}: ${cur}${vars[0].base_price ?? "—"}`}
            />
            {vars.length > 1 && (
              <span className="text-[11px] text-gray-400 dark:text-slate-500">
                +{vars.length - 1}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Base Price",
      key: "base_price",
      align: "right",
      responsive: ["md"],
      render: (_, record) => {
        const price = getLowestBasePrice(record);
        return (
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            {price ? `${cur}${price.toFixed(2)}` : "—"}
          </span>
        );
      },
    },
    {
      title: "Sale Price",
      key: "discounted_price",
      align: "right",
      responsive: ["md"],
      render: (_, record) => {
        const price = getLowestDiscountedPrice(record);
        return price ? (
          <span className="text-sm font-semibold text-emerald-500">
            {cur}
            {price.toFixed(2)}
          </span>
        ) : (
          <span className="text-sm text-gray-300 dark:text-slate-600">—</span>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      align: "center",
      width: 110,
      responsive: ["md"],
      render: (_, record) => (
        <StatusBadge status={record.status as ProductStatus} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 96,
      render: (_, record) => (
        <div
          className="flex gap-1.5 justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <EditButton onClick={() => handleEdit(record.slug)} />
          <DeleteButton onClick={() => showDeleteModal(record.id)} />
        </div>
      ),
    },
  ];

  return (
    <>
      {/* ── Table header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-base">
            🛍️
          </div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            Product List
          </h2>
        </div>
        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-full">
          {products.length} items
        </span>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden flex flex-col gap-2.5 p-3">
        {products.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-4xl">📦</span>
            <p className="text-sm text-gray-400 dark:text-slate-500">
              No products found
            </p>
          </div>
        )}

        {products.map((record) => {
          const basePrice = getLowestBasePrice(record);
          const discountedPrice = getLowestDiscountedPrice(record);
          const variants = record.product_variants || [];

          return (
            <ProductCardLayout
              key={record.id}
              image={
                <Image
                  src={getProductImage(record)}
                  alt={record.name}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              }
              title={record.name}
              subtitle={record.category?.name || "Uncategorized"}
              content={
                <div className="flex flex-col gap-2.5 mt-1">
                  {/* Variants */}
                  {variants.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <VariantChip
                        label={`${variants[0].variant_name ?? "Unnamed"}: ${cur}${variants[0].base_price ?? "—"}`}
                      />
                      {variants.length > 1 && (
                        <span className="text-[11px] text-gray-400 dark:text-slate-500">
                          +{variants.length - 1} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Price + Status + Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Price */}
                    <div className="flex items-center gap-1.5">
                      {discountedPrice ? (
                        <>
                          <span className="text-xs text-gray-400 line-through">
                            {basePrice ? `${cur}${basePrice.toFixed(2)}` : "—"}
                          </span>
                          <span className="text-sm font-bold text-emerald-500">
                            {cur}
                            {discountedPrice.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-gray-700 dark:text-slate-300">
                          {basePrice ? `${cur}${basePrice.toFixed(2)}` : "—"}
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <StatusBadge status={record.status as ProductStatus} />

                    {/* Actions */}
                    <div
                      className="flex gap-1.5 ml-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EditButton onClick={() => handleEdit(record.slug)} />
                      <DeleteButton
                        onClick={() => showDeleteModal(record.id)}
                      />
                    </div>
                  </div>
                </div>
              }
            />
          );
        })}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block">
        <DataTable<ProductWithVariants>
          columns={columns}
          data={products}
          rowKey="id"
          pagination={false}
          loading={loading}
          size="middle"
          bordered={false}
        />
      </div>

      {/* ── Delete Modal ── */}
      <Modal
        open={modalOpen}
        title={
          <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
            Delete Product
          </span>
        }
        onOk={handleDelete}
        onCancel={() => setModalOpen(false)}
        okText="Delete"
        cancelText="Cancel"
        confirmLoading={deleteLoading}
        centered
        okButtonProps={{ danger: true }}
      >
        <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
          Are you sure you want to delete this product? This action is permanent
          and cannot be undone.
        </p>
      </Modal>
    </>
  );
};

export default ProductTable;
