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

interface ProductTableProps {
  products: ProductWithVariants[];
  loading?: boolean;
  onDeleteSuccess?: () => void;
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
}) => {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const sheiNotif = useSheiNotification();

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
          <div className="flex flex-wrap gap-1">
            {vars.slice(0, 3).map((v) => (
              <Tag
                key={v.id}
                color="blue"
                className="rounded-lg px-2 py-0.5 text-xs font-medium"
              >
                {v.variant_name ?? "Unnamed"}: ${v.base_price ?? "N/A"}
              </Tag>
            ))}
            {vars.length > 3 && (
              <span className="text-xs">+{vars.length - 3} more</span>
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
            {price ? `$${price.toFixed(2)}` : "—"}
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
            {price ? `$${price.toFixed(2)}` : "—"}
          </span>
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
      <div className="rounded-2xl border border-gray-100 shadow-md overflow-hidden p-4">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">🛍️ Product List</h2>
          <span className="text-sm text-gray-500">
            Total: {products.length} items
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
                (v) => v.product_images || []
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
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap gap-1">
                      {variants.slice(0, 3).map((v) => (
                        <Tag
                          key={v.id}
                          color="blue"
                          className="rounded-lg px-2 py-0.5 text-xs font-medium"
                        >
                          {v.variant_name ?? "Unnamed"}: $
                          {v.base_price ?? "N/A"}
                        </Tag>
                      ))}
                      {variants.length > 3 && (
                        <span className="text-xs">
                          +{variants.length - 3} more
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className="font-medium">
                        {basePrice ? `$${basePrice.toFixed(2)}` : "—"}
                      </span>
                      <span
                        className={`font-medium ${
                          discountedPrice ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {discountedPrice
                          ? `$${discountedPrice.toFixed(2)}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                }
                actions={
                  <>
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
                  </>
                }
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
            pagination={{ pageSize: 8 }}
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
