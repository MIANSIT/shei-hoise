"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";

interface Product {
  id: number;
  title: string;
  category: string;
  currentPrice: string;
  originalPrice: string;
  discount: number;
  stock: number;
  images: string[];
}

interface ProductTableProps {
  products: Product[];
  loading?: boolean;
  modernStyle?: boolean; // ✅ optional flag for modern look
}

const ProductTable: React.FC<ProductTableProps> = ({ products, loading }) => {
  const router = useRouter();

  const handleEdit = (id: number) =>
    router.push(`/dashboard/products/edit-product/${id}`);
  const handleDelete = (id: number) => console.log("Delete product:", id);

  const columns: ColumnsType<Product> = [
    {
      title: "Image",
      dataIndex: "images",
      key: "image",
      align: "center",
      render: (images: string[]) => (
        <div className="flex justify-center items-center h-16">
          <Image
            src={images[0]}
            alt="product"
            width={64}
            height={64}
            className="rounded-md object-cover"
          />
        </div>
      ),
    },
    {
      title: "Title",
      dataIndex: "title",
      align: "center",

      key: "title",
      ellipsis: true,
    },
    {
      title: "Category",
      dataIndex: "category",
      align: "center",

      key: "category",
    },
    {
      title: "Price",
      align: "center",

      key: "price",
      render: (_, record) => (
        <div className="flex flex-col items-center">
          <span className="font-semibold text-lg">₹{record.currentPrice}</span>
          <span className="text-gray-400 line-through text-sm">
            ₹{record.originalPrice}
          </span>
        </div>
      ),
    },
    {
      title: "Discount",
      dataIndex: "discount",
      align: "center",

      key: "discount",
      render: (discount: number) => (
        <span
          className={`px-2 py-1 rounded ${
            discount > 0
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {discount}%
        </span>
      ),
    },
    {
      title: "Stock",
      dataIndex: "stock",
      align: "center",

      key: "stock",
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
    <DataTable<Product>
      columns={columns}
      data={products}
      rowKey="id"
      pagination={{ pageSize: 10 }}
      loading={loading}
      size="middle"
      bordered={true}
    />
  );
};

export default ProductTable;
