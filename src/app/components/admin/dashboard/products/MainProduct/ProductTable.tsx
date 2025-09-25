"use client";

import React from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";

interface ProductTableProps {
  products: ProductWithVariants[];
  loading?: boolean;
}

const ProductTable: React.FC<ProductTableProps> = ({ products, loading }) => {
  const router = useRouter();

  const handleEdit = (id: string) => router.push(`/dashboard/products/edit-product/${id}`);
  const handleDelete = (id: string) => console.log("Delete product:", id);

  const columns: ColumnsType<ProductWithVariants> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      align: "center",
    },
    {
      title: "Category",
      key: "category",
      align: "center",
      render: (_, record) => record.category?.name || "None",
    },
    {
      title: "Base Price",
      dataIndex: "base_price",
      key: "base_price",
      align: "center",
      render: (price: number | null) => (price ?? "—"),
    },
    {
      title: "Discounted Price",
      dataIndex: "discounted_price",
      key: "discounted_price",
      align: "center",
      render: (price: number | null) => (price ?? "—"),
    },
    {
      title: "Variants",
      key: "variants",
      align: "center",
      render: (_, record) => {
        const vars = record.product_variants;
        if (!vars || vars.length === 0)
          return <span className="text-gray-400">None</span>;
        return (
          <div className="flex flex-col gap-1">
            {vars.map((v) => (
              <span key={v.id} className="text-sm">
                {v.variant_name ?? "(Unnamed)"} – {v.price ?? "N/A"}
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
        <div className="flex gap-2 justify-center">
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
            onClick={() => handleEdit(record.id)}
          >
            Edit
          </button>
          <button
            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable<ProductWithVariants>
      columns={columns}
      data={products}
      rowKey="id"
      pagination={{ pageSize: 10 }}
      loading={loading}
      size="middle"
      bordered
    />
  );
};

export default ProductTable;
