"use client";

import React from "react";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import { Order, Product } from "@/lib/types/types";
import { Tooltip } from "antd";
import StatusTag, { StatusType } from "./StatusTag";

interface Props {
  products: Product[];
  order: Order;
}

const ProductListTable: React.FC<Props> = ({ products, order }) => {
  const columns: ColumnsType<Product> = [
    {
      title: "Product",
      dataIndex: "title",
      key: "title",
      render: (title: string, product: Product) => (
        <Tooltip
          title={`Quantity: ${product.quantity} × $${product.price.toFixed(2)}`}
        >
          <div className="truncate max-w-[200px]">{title}</div>
        </Tooltip>
      ),
    },
    { title: "Quantity", dataIndex: "quantity", key: "quantity" },
    {
      title: "Unit Price",
      dataIndex: "price",
      key: "price",
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: "Grand Total",
      key: "lineTotal",
      render: (_, p: Product) => `$${(p.price * p.quantity).toFixed(2)}`,
    },
    {
      title: "Delivery Option",
      key: "deliveryOption",
      render: () => {
        const value: StatusType = order.deliveryOption.toLowerCase() as StatusType;
        return <StatusTag status={value} />;
      },
    },
    {
      title: "Payment Method",
      key: "paymentMethod",
      render: () => {
        const value: StatusType = order.paymentMethod.toLowerCase() as StatusType;
        return <StatusTag status={value} />;
      },
    },
  ];

  return (
    <DataTable<Product>
      columns={columns}
      data={products}
      pagination={false}
      bordered={false}
      size="small"
      rowKey="key"
      rowClassName={() => "hover:bg-gray-100"}
    />
  );
};

export default ProductListTable;
