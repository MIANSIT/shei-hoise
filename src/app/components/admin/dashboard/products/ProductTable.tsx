"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import DataTable from "../../common/DataTable";
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
  loading?: boolean; // ready for API
}

const ProductTable: React.FC<ProductTableProps> = ({ products, loading }) => {
  const router = useRouter();

  const handleEdit = (id: number) => {
    router.push(`/dashboard/products/edit-product/${id}`);
  };

  const handleDelete = (id: number) => {
    console.log("Delete product:", id);
  };

  const columns: ColumnsType<Product> = [
    {
      title: "Image",
      dataIndex: "images",
      key: "image",
      render: (images: string[]) => (
        <div className="w-16 h-16 relative mx-auto">
          <Image
            src={images[0]}
            alt="product"
            fill
            className="object-cover rounded-md"
          />
        </div>
      ),
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text: string) => (
        <span className="block max-w-[200px] truncate">{text}</span>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
    },
    {
      title: "Price",
      key: "price",
      render: (_, record) => (
        <div className="flex flex-col items-center">
          <span className="font-semibold text-lg">₹{record.currentPrice}</span>
          <span className="line-through text-gray-400 text-sm">
            ₹{record.originalPrice}
          </span>
        </div>
      ),
    },
    {
      title: "Discount",
      dataIndex: "discount",
      key: "discount",
      render: (discount: number) => (
        <span className="text-green-400 font-semibold">{discount}%</span>
      ),
    },
    {
      title: "Stock",
      dataIndex: "stock",
      key: "stock",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            className="bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
            size="sm"
            onClick={() => handleEdit(record.id)}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            className="bg-red-500 text-white hover:bg-red-600 cursor-pointer"
            size="sm"
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="transparent-table">
      <DataTable<Product>
        columns={columns}
        data={products}
        pagination={{ pageSize: 10 }} // ✅ AntD default pagination
        loading={loading}
      />
    </div>
  );
};

export default ProductTable;
