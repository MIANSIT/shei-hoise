"use client";

import React from "react";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import { Tooltip } from "antd";
import EditableOrderStatus from "./EditableOrderStatus";
import OrderStatusTag from "./OrderStatusTag";

interface Product {
  title: string;
  quantity: number;
  price: number;
  key: string;
}

interface Props {
  products: Omit<Product, "key">[];
  orderId: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  onSaveStatus: (newStatus: Props["status"]) => void;
}

const OrderProductTable: React.FC<Props> = ({ products, orderId, status, onSaveStatus }) => {
  const productsWithKey = products.map((p, idx) => ({
    ...p,
    key: `${orderId}-${idx}`,
  }));

  const columns: ColumnsType<Product> = [
    {
      title: "Product",
      dataIndex: "title",
      key: "title",
      render: (title: string, product: Product) => (
        <Tooltip title={`Quantity: ${product.quantity} × $${product.price.toFixed(2)}`}>
          <div
            style={{
              display: "inline-block",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              maxWidth: "150px",
            }}
          >
            {title}
          </div>
        </Tooltip>
      ),
    },
    { title: "Quantity", dataIndex: "quantity", key: "quantity" },
    { title: "Unit Price", dataIndex: "price", key: "price", render: (price: number) => `$${price.toFixed(2)}` },
    { title: "Line Total", key: "lineTotal", render: (_, p: Product) => `$${(p.price * p.quantity).toFixed(2)}` },
  ];

  const isLocked = status === "delivered" || status === "cancelled";

  return (
    <div className="p-4 bg-gray-50 rounded-md space-y-4">
      <DataTable<Product>
        columns={columns}
        data={productsWithKey}
        pagination={false}
        bordered={false}
        size="small"
        rowKey="key"
        rowClassName={() => "hover:bg-gray-100"}
      />

      {/* Show dropdown + save for editable orders, tag only for delivered/cancelled */}
      {isLocked ? (
        <OrderStatusTag status={status} />
      ) : (
        <EditableOrderStatus status={status} onSave={onSaveStatus} />
      )}
    </div>
  );
};

export default OrderProductTable;
