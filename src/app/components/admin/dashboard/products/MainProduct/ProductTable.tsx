"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { Edit, Trash2 } from "lucide-react";
import { Modal, Tag } from "antd";
import { deleteProduct } from "@/lib/queries/products/deleteProduct";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import Image from "next/image";
import ProductCardLayout from "@/app/components/admin/common/ProductCardLayout"; // adjust path if needed
import type { TablePaginationConfig } from "antd/es/table";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { ProductStatus } from "@/lib/types/enums";

interface ProductTableProps {
  products: ProductWithVariants[];
  loading?: boolean;
  onDeleteSuccess?: () => void;
  pagination?: TablePaginationConfig;
}

// Helper functions
const getLowestBasePrice = (product: ProductWithVariants) => {
  const variantPrices =
    product.product_variants?.map((v) => v.base_price).filter(Boolean) || [];
  return variantPrices.length > 0
    ? Math.min(...(variantPrices as number[]))
    : product.base_price;
};

const getLowestDiscountedPrice = (product: ProductWithVariants) => {
  const variantDiscounts =
    (product.product_variants
      ?.map((v) => v.discounted_price)
      .filter(Boolean) as number[]) || [];
  if (variantDiscounts.length > 0) return Math.min(...variantDiscounts);
  return product.discounted_price || null;
};

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  loading,
  onDeleteSuccess,
  pagination,
}) => {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const sheiNotif = useSheiNotification();
  const {
    // currency,
    icon: currencyIcon,
    loading: currencyLoading,
  } = useUserCurrencyIcon();

  const handleEdit = (slug: string) =>
    router.push(`/dashboard/products/edit-product/${slug}`);

  const showDeleteModal = (id: string) => {
    setDeletingId(id);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(deletingId);
      sheiNotif.success("✅ Product deleted successfully");
      setModalOpen(false);
      setDeletingId(null);
      onDeleteSuccess?.();
    } catch (err) {
      console.error(err);
      sheiNotif.error("❌ Failed to delete product");
    } finally {
      setDeleteLoading(false);
    }
  };

  const displayCurrencyIcon = currencyLoading ? null : (currencyIcon ?? null);
  // const displayCurrency = currencyLoading ? "" : currency ?? "";
  const displayCurrencyIconSafe = displayCurrencyIcon || "৳"; // fallback

  // AntD columns for desktop
  const columns: ColumnsType<ProductWithVariants> = [
    {
      title: "",
      key: "image",
      align: "center",
      width: 80,
      responsive: ["md"],
      render: (_, record) => {
        const productImage =
          record.product_images?.find((img) => img.is_primary) ||
          record.product_images?.[0] ||
          record.product_variants
            ?.flatMap((v) => v.product_images || [])
            .find((img) => img.is_primary) ||
          record.product_variants?.flatMap((v) => v.product_images || [])[0];

        const imageUrl =
          productImage?.image_url ||
          "https://lizjlqgrurjegmjeujki.supabase.co/storage/v1/object/public/dummyImage/logo.png";

        return (
          <div className="flex justify-center items-center">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border shadow-sm">
              <Image
                src={imageUrl}
                alt={record.name}
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        );
      },
    },
    {
      title: "Product",
      key: "name",
      align: "left",
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="font-semibold">{record.name}</span>
          <span className="text-sm text-gray-500">
            {record.category?.name || "Uncategorized"}
          </span>
        </div>
      ),
    },
    {
      title: "Variants",
      key: "variants",
      align: "left",
      width: 250,
      responsive: ["md"],
      render: (_, record) => {
        const vars = record.product_variants || [];
        if (!vars.length) return <span className="italic">—</span>;

        return (
          <div className="flex flex-wrap gap-1 items-center">
            <Tag
              key={vars[0].id}
              color="blue"
              className="rounded-lg px-2 py-0.5 text-xs font-medium"
            >
              {vars[0].variant_name ?? "Unnamed"}: $
              {vars[0].base_price ?? "N/A"}
            </Tag>
            {vars.length > 1 && (
              <span className="text-xs text-gray-500">
                +{vars.length - 1} more
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
          <span className="font-medium">
            {price ? `${displayCurrencyIconSafe}${price.toFixed(2)}` : "—"}
          </span>
        );
      },
    },
    {
      title: "Discounted",
      key: "discounted_price",
      align: "right",
      responsive: ["md"],
      render: (_, record) => {
        const price = getLowestDiscountedPrice(record);
        return (
          <span
            className={`font-medium ${
              price ? "text-green-600" : "text-gray-400"
            }`}
          >
            {price ? `${displayCurrencyIconSafe}${price.toFixed(2)}` : "—"}
          </span>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      align: "center",
      width: 120,
      responsive: ["md"],
      render: (_, record) => {
        let color = "red";
        let label = "Inactive";

        switch (record.status) {
          case ProductStatus.ACTIVE:
            color = "green";
            label = "Active";
            break;
          case ProductStatus.DRAFT:
            color = "orange";
            label = "Draft";
            break;
          case ProductStatus.INACTIVE:
          default:
            color = "red";
            label = "Inactive";
            break;
        }

        return (
          <Tag
            color={color}
            className="rounded-lg px-2 py-0.5 text-sm font-medium"
          >
            {label}
          </Tag>
        );
      },
    },
    {
      title: "Action",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <div
          className="flex gap-2 justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
            onClick={() => handleEdit(record.slug)}
          >
            <Edit className="w-5 h-5 text-blue-600" />
          </button>
          <button
            className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition"
            onClick={() => showDeleteModal(record.id)}
          >
            <Trash2 className="w-5 h-5 text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="rounded-2xl border border-gray-100 shadow-md overflow-hidden">
        <div className="p-2.5 flex justify-between items-center">
          <h2 className="text-lg font-semibold">🛍️ Product List</h2>
          <span className="text-sm text-gray-500">
            <span className="text-sm text-gray-500">
              Showing {products.length} items
            </span>
          </span>
        </div>

        {/* Mobile view */}
        <div className="md:hidden flex flex-col gap-4">
          {products.map((record) => {
            const productImage =
              record.product_images?.find((img) => img.is_primary) ||
              record.product_images?.[0] ||
              record.product_variants
                ?.flatMap((v) => v.product_images || [])
                .find((img) => img.is_primary) ||
              record.product_variants?.flatMap(
                (v) => v.product_images || [],
              )[0];

            const imageUrl =
              productImage?.image_url ||
              "https://lizjlqgrurjegmjeujki.supabase.co/storage/v1/object/public/dummyImage/logo.png";

            const variants = record.product_variants || [];

            const basePrice = getLowestBasePrice(record);
            const discountedPrice = getLowestDiscountedPrice(record);

            return (
              <ProductCardLayout
                key={record.id}
                image={
                  <Image
                    src={imageUrl}
                    alt={record.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                }
                title={record.name}
                subtitle={record.category?.name || "Uncategorized"}
                content={
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-1">
                      {variants.length > 0 ? (
                        <>
                          <Tag
                            key={variants[0].id}
                            color="blue"
                            className="rounded-lg px-2 py-0.5 text-xs font-medium"
                          >
                            {variants[0].variant_name ?? "Unnamed"}: $
                            {variants[0].base_price ?? "N/A"}
                          </Tag>
                          {variants.length > 1 && (
                            <span className="text-xs text-gray-500 ml-1">
                              +{variants.length - 1} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="italic"></span>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      {/* Price */}
                      <div className="flex gap-2 items-center">
                        {discountedPrice ? (
                          <>
                            <span className="text-red-500 line-through">
                              {basePrice
                                ? `${displayCurrencyIconSafe}${basePrice.toFixed(2)}`
                                : "—"}
                            </span>
                            <span className="font-medium text-green-600">
                              {`${displayCurrencyIconSafe}${discountedPrice.toFixed(2)}`}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium">
                            {basePrice
                              ? `${displayCurrencyIconSafe}${basePrice.toFixed(2)}`
                              : "—"}
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Status:</span>
                        <Tag
                          color={
                            record.status === ProductStatus.ACTIVE
                              ? "green"
                              : record.status === ProductStatus.DRAFT
                                ? "orange"
                                : "red"
                          }
                          className="rounded-lg px-2 py-0.5 text-xs"
                        >
                          {record.status === ProductStatus.ACTIVE
                            ? "Active"
                            : record.status === ProductStatus.DRAFT
                              ? "Draft"
                              : "Inactive"}
                        </Tag>
                      </div>

                      {/* Action buttons */}
                      <div
                        className="flex gap-2 ml-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                          onClick={() => handleEdit(record.slug)}
                        >
                          <Edit className="w-5 h-5 text-blue-600" />
                        </button>
                        <button
                          className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition"
                          onClick={() => showDeleteModal(record.id)}
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                }
                // Remove the actions prop since buttons are now in content
              />
            );
          })}
        </div>

        {/* Desktop view */}
        <div className="hidden md:block">
          <DataTable<ProductWithVariants>
            columns={columns}
            data={products}
            rowKey="id"
            pagination={pagination}
            loading={loading}
            size="middle"
            bordered={false}
          />
        </div>
      </div>

      <Modal
        open={modalOpen}
        title="Delete Product"
        onOk={handleDelete}
        onCancel={() => setModalOpen(false)}
        okText="Yes, Delete"
        cancelText="Cancel"
        confirmLoading={deleteLoading}
        centered
      >
        <p>
          Are you sure you want to delete this product? This action cannot be
          undone.
        </p>
      </Modal>
    </>
  );
};

export default ProductTable;
