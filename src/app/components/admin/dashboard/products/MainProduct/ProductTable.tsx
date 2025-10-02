"use client";

import React from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import { ProductWithVariants } from "@/lib/queries/products/getProductsWithVariants";
import { Edit, Trash2 } from "lucide-react";

interface ProductTableProps {
  products: ProductWithVariants[];
  loading?: boolean;
}

const ProductTable: React.FC<ProductTableProps> = ({ products, loading }) => {
  const router = useRouter();

  const handleEdit = (id: string) =>
    router.push(`/dashboard/products/edit-product/${id}`);
  const handleDelete = (id: string) => console.log("Delete product:", id);

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
            onClick={() => handleEdit(record.id)}
          >
            <Edit className="w-5 h-5 text-blue-600" />
          </button>
          <button
            className="p-1 rounded hover:bg-red-100 transition"
            onClick={() => handleDelete(record.id)}
          >
            <Trash2 className="w-5 h-5 text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  return (
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
  );
};

export default ProductTable;
