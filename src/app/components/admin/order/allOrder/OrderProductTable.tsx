"use client";

import React, { useState } from "react";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import { Tooltip, Tag, Button } from "antd";
import EditableOrderStatus from "./EditableOrderStatus";
import OrderStatusTag from "./OrderStatusTag";
import EditablePaymentStatus from "./EditablePaymentStatus";
import PaymentStatusTag from "./PaymentStatusTag";

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
  deliveryOption: "Pathao" | "Courier" | "Other";
  paymentMethod: "COD" | "Online";
  paymentStatus: "paid" | "pending" | "failed";
  onSaveStatus: (newStatus: Props["status"]) => void;
  onSavePaymentStatus: (newStatus: Props["paymentStatus"]) => void;
}

const OrderProductTable: React.FC<Props> = ({
  products,
  orderId,
  status,
  deliveryOption,
  paymentMethod,
  paymentStatus,
  onSaveStatus,
  onSavePaymentStatus,
}) => {
  const productsWithKey = products.map((p, idx) => ({ ...p, key: `${orderId}-${idx}` }));

  // Determine if the row is locked
  const isLocked = (status === "delivered" || status === "cancelled") && paymentStatus === "paid";

  // State for editable dropdowns
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(paymentStatus);

  const handleSaveAll = () => {
    if (selectedStatus !== status) onSaveStatus(selectedStatus);
    if (selectedPaymentStatus !== paymentStatus) onSavePaymentStatus(selectedPaymentStatus);
  };

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
              maxWidth: 200,
            }}
          >
            {title}
          </div>
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
      title: "Line Total",
      key: "lineTotal",
      render: (_, p: Product) => `$${(p.price * p.quantity).toFixed(2)}`,
    },
    {
      title: "Delivery",
      key: "deliveryOption",
      render: () => <Tag color="blue">{deliveryOption}</Tag>,
    },
    {
      title: "Payment Method",
      key: "paymentMethod",
      render: () => <Tag color="purple">{paymentMethod}</Tag>,
    },
  ];

  return (
    <div className="p-4 bg-gray-50 rounded-md space-y-4">
      {/* Products table */}
      <DataTable<Product>
        columns={columns}
        data={productsWithKey}
        pagination={false}
        bordered={false}
        size="small"
        rowKey="key"
        rowClassName={() => "hover:bg-gray-100"}
      />

      {/* Editable dropdowns with single Save button */}
      <div className="flex gap-6 flex-wrap items-center mt-2">
        <div>
          <span className="font-medium">Order Status:</span>{" "}
          {status === "delivered" || status === "cancelled" ? (
            <OrderStatusTag status={status} />
          ) : (
            <EditableOrderStatus status={selectedStatus} onSave={setSelectedStatus} />
          )}
        </div>

        <div>
          <span className="font-medium">Payment Status:</span>{" "}
          {paymentStatus === "paid" ? (
            <PaymentStatusTag status="paid" />
          ) : (
            <EditablePaymentStatus
              status={selectedPaymentStatus}
              onSave={setSelectedPaymentStatus}
            />
          )}
        </div>

        {/* Show Save button only if not locked */}
        {!isLocked && (
          <Button
            type="primary"
            onClick={handleSaveAll}
            disabled={
              selectedStatus === status && selectedPaymentStatus === paymentStatus
            }
          >
            Save
          </Button>
        )}
      </div>
    </div>
  );
};

export default OrderProductTable;
