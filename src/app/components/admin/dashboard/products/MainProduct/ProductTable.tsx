"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { Edit, Trash2 } from "lucide-react";
import { Modal } from "antd";
import { deleteProduct } from "@/lib/queries/products/deleteProduct";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface ProductTableProps {
  products: ProductWithVariants[];
  loading?: boolean;
  onDeleteSuccess?: () => void; // callback to refresh parent
}

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

      sheiNotif.success("Product deleted successfully");

      setModalOpen(false);
      setDeletingId(null);

      if (onDeleteSuccess) onDeleteSuccess(); // refresh parent table
    } catch (err) {
      console.error(err);
      sheiNotif.error("Failed to delete product");
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: ColumnsType<ProductWithVariants> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      align: "left",
      render: (text: string) => (
        <span className="font-medium text-gray-800 truncate block max-w-[200px]">
          {text}
        </span>
      ),
    },
    {
      title: "Category",
      key: "category",
      align: "left",
      render: (_, record) => (
        <span className="text-gray-600">{record.category?.name || "—"}</span>
      ),
    },
    {
      title: "Base Price",
      dataIndex: "base_price",
      key: "base_price",
      align: "right",
      render: (price: number | null) => (
        <span className="text-gray-700 font-medium">
          {price !== null ? `$${price.toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      title: "Discounted Price",
      dataIndex: "discounted_price",
      key: "discounted_price",
      align: "right",
      render: (price: number | null) => (
        <span
          className={`font-medium ${
            price ? "text-green-600" : "text-gray-400"
          }`}
        >
          {price !== null ? `$${price.toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      title: "Variants",
      key: "variants",
      align: "left",
      width: 200,
      render: (_, record) => {
        const vars = record.product_variants;
        if (!vars || vars.length === 0)
          return <span className="text-gray-400 italic">None</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {vars.map((v) => (
              <span
                key={v.id}
                className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
              >
                {v.variant_name ?? "(Unnamed)"}: ${v.price ?? "N/A"}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <div
          className="flex gap-2 justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="p-1 rounded hover:bg-blue-100 transition"
            onClick={() => handleEdit(record.slug)}
          >
            <Edit className="w-5 h-5 text-blue-600" />
          </button>
          <button
            className="p-1 rounded hover:bg-red-100 transition"
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
      <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
        <DataTable<ProductWithVariants>
          columns={columns}
          data={products}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
          size="middle"
          bordered={false}
          rowClassName={(record, index) =>
            index % 2 === 0
              ? "bg-white hover:bg-gray-50 transition-transform"
              : "bg-gray-50 hover:bg-gray-100 transition-transform"
          }
        />
      </div>

      <Modal
        open={modalOpen}
        title="Are you sure?"
        onOk={handleDelete}
        onCancel={() => setModalOpen(false)}
        okText="Yes, Delete"
        cancelText="Cancel"
        confirmLoading={deleteLoading}
      >
        <p>
          Do you really want to delete this product? This action cannot be
          undone.
        </p>
      </Modal>
    </>
  );
};

export default ProductTable;
