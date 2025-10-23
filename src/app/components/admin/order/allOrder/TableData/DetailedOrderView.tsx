"use client";

import React from "react";
import DataTable from "@/app/components/admin/common/DataTable";
import { ColumnsType } from "antd/es/table";
import { StoreOrder, OrderItem } from "@/lib/types/order";
import StatusTag, { StatusType } from "../StatusFilter/StatusTag";
import { Tooltip, Typography } from "antd";

const { Text } = Typography;

interface Props {
  order: StoreOrder;
}

const DetailedOrderView: React.FC<Props> = ({ order }) => {
  const productColumns: ColumnsType<OrderItem> = [
    {
      title: "Product",
      dataIndex: "product_name",
      key: "product_name",
      render: (name: string, record: OrderItem) => (
        <div>
          <div className="font-medium">{name}</div>
          {record.variant_details && (
            <Text type="secondary" className="text-xs">
              Variant: {JSON.stringify(record.variant_details)}
            </Text>
          )}
        </div>
      ),
    },
    { 
      title: "Quantity", 
      dataIndex: "quantity", 
      key: "quantity",
      align: 'center' as const,
    },
    {
      title: "Unit Price",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (price: number) => `৳${price.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: "Total",
      dataIndex: "total_price",
      key: "total_price",
      render: (total: number) => `৳${total.toFixed(2)}`,
      align: 'right' as const,
    },
  ];

  const address = order.shipping_address;
  const fullAddress = `${address.address_line_1}, ${address.city}, ${address.country}`;

  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";

  // Calculate delivery option and payment method from existing data
  const deliveryOption = "courier" as const;
  const paymentMethod = order.payment_method === "cod" ? "cod" : "online" as const;

  return (
    <div className="space-y-6 p-4 bg-white rounded-lg border">
      {/* Order Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md">
        <div>
          <strong>Order Number:</strong>
          <div className="font-mono">#{order.order_number}</div>
        </div>
        <div>
          <strong>Order Date:</strong>
          <div>{new Date(order.created_at).toLocaleDateString()}</div>
        </div>
        <div>
          <strong>Total Amount:</strong>
          <div className="font-semibold text-lg">
            ৳{order.total_amount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div>
        <h3 className="font-semibold mb-3 text-lg">Order Items</h3>
        <DataTable
          columns={productColumns}
          data={order.order_items}
          pagination={false}
          bordered={true}
          size="middle"
          rowKey={(record) => record.id}
        />
      </div>

      {/* Pricing Breakdown */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="font-semibold mb-3">Pricing Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>৳{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax Amount:</span>
              <span>৳{order.tax_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping Fee:</span>
              <span>৳{order.shipping_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total Amount:</span>
              <span>৳{order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery & Payment Info */}
      <div>
        <h3 className="font-semibold mb-3 text-lg">Delivery & Payment Information</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 bg-white border rounded-md">
          {/* Customer Information */}
          <div className="space-y-3">
            <div>
              <strong className="block mb-1">Customer Information:</strong>
              <div>{address.customer_name}</div>
              <div className="text-sm text-gray-600">{order.customers?.email || 'No email'}</div>
              <div className="text-sm text-gray-600">{address.phone}</div>
            </div>
            <div>
              <strong className="block mb-1">Delivery Address:</strong>
              <div className="text-sm">{fullAddress}</div>
            </div>
            {order.notes && (
              <div>
                <strong className="block mb-1">Order Notes:</strong>
                <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                  {order.notes}
                </div>
              </div>
            )}
          </div>

          {/* Status Information */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4">
              <div>
                <strong className="block mb-1">Order Status:</strong>
                <StatusTag status={order.status as StatusType} />
              </div>
              
              <div>
                <strong className="block mb-1">Payment Status:</strong>
                <StatusTag status={order.payment_status as StatusType} />
              </div>

              {!isCancelled && !isDelivered && (
                <div>
                  <strong className="block mb-1">Delivery Method:</strong>
                  <StatusTag status={deliveryOption} />
                </div>
              )}

              <div>
                <strong className="block mb-1">Payment Method:</strong>
                <StatusTag status={paymentMethod} />
              </div>
            </div>

            {isCancelled && order.notes && (
              <div>
                <strong className="block mb-1">Cancellation Note:</strong>
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {order.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedOrderView;