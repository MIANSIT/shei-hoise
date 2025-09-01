"use client";

import React, { useState } from "react";
import DataTable from "@/app/components/admin/common/DataTable";
import type { ColumnsType } from "antd/es/table";
import { Tooltip, Tag, Button } from "antd";
import EditableOrderStatus from "./EditableOrderStatus";
import EditablePaymentStatus from "./EditablePaymentStatus";
import EditableDeliveryOption from "./EditableDeliveryOption";
import EditablePaymentMethod from "./EditablePaymentMethod";
import StatusTag from "./StatusTag";

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
  onSaveDeliveryOption: (newOption: Props["deliveryOption"]) => void;
  onSavePaymentMethod: (newMethod: Props["paymentMethod"]) => void;
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
  onSaveDeliveryOption,
  onSavePaymentMethod,
}) => {
  const productsWithKey = products.map((p, idx) => ({
    ...p,
    key: `${orderId}-${idx}`,
  }));

  const isLocked =
    (status === "delivered" || status === "cancelled") &&
    paymentStatus === "paid";

  // local states
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [selectedPaymentStatus, setSelectedPaymentStatus] =
    useState(paymentStatus);
  const [selectedDeliveryOption, setSelectedDeliveryOption] =
    useState(deliveryOption);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState(paymentMethod);

  const handleSaveAll = () => {
    if (selectedStatus !== status) onSaveStatus(selectedStatus);
    if (selectedPaymentStatus !== paymentStatus)
      onSavePaymentStatus(selectedPaymentStatus);
    if (selectedDeliveryOption !== deliveryOption)
      onSaveDeliveryOption(selectedDeliveryOption);
    if (selectedPaymentMethod !== paymentMethod)
      onSavePaymentMethod(selectedPaymentMethod);
  };

  const columns: ColumnsType<Product> = [
    {
      title: "Product",
      dataIndex: "title",
      key: "title",
      render: (title: string, product: Product) => (
        <Tooltip
          title={`Quantity: ${product.quantity} × $${product.price.toFixed(2)}`}
        >
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
      <DataTable<Product>
        columns={columns}
        data={productsWithKey}
        pagination={false}
        bordered={false}
        size="small"
        rowKey="key"
        rowClassName={() => "hover:bg-gray-100"}
      />

      <div className="flex gap-6 flex-wrap items-center mt-2">
        {/* Order Status */}
        <div>
          <span className="font-medium">Order Status:</span>{" "}
          {status === "delivered" || status === "cancelled" ? (
            <StatusTag status={status} />
          ) : (
            <EditableOrderStatus
              status={selectedStatus}
              onSave={setSelectedStatus}
            />
          )}
        </div>

        {/* Payment Status */}
        <div>
          <span className="font-medium">Payment Status:</span>{" "}
          {paymentStatus === "paid" ? (
            <StatusTag status="paid" />
          ) : (
            <EditablePaymentStatus
              status={selectedPaymentStatus}
              onSave={setSelectedPaymentStatus}
            />
          )}
        </div>

        {/* Delivery Option */}
        <div>
          <span className="font-medium">Delivery Option:</span>{" "}
          <EditableDeliveryOption
            option={selectedDeliveryOption}
            onSave={setSelectedDeliveryOption}
          />
        </div>

        {/* Payment Method */}
        <div>
          <span className="font-medium">Payment Method:</span>{" "}
          <EditablePaymentMethod
            method={selectedPaymentMethod}
            onSave={setSelectedPaymentMethod}
          />
        </div>

        {/* Save Button */}
        {!isLocked && (
          <Button
            type="primary"
            onClick={handleSaveAll}
            disabled={
              selectedStatus === status &&
              selectedPaymentStatus === paymentStatus &&
              selectedDeliveryOption === deliveryOption &&
              selectedPaymentMethod === paymentMethod
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
