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
          <div className="font-medium text-sm sm:text-base">{name}</div>
          {record.variant_details && (
            <Text type="secondary" className="text-xs">
              Variant: {JSON.stringify(record.variant_details)}
            </Text>
          )}
        </div>
      ),
      width: "40%",
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      align: "center" as const,
      width: "15%",
    },
    {
      title: "Unit Price",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (price: number) => `৳${price.toFixed(2)}`,
      align: "right" as const,
      width: "20%",
    },
    {
      title: "Total",
      dataIndex: "total_price",
      key: "total_price",
      render: (total: number) => `৳${total.toFixed(2)}`,
      align: "right" as const,
      width: "25%",
    },
  ];

  const address = order.shipping_address;
  const fullAddress = `${address.address_line_1}, ${address.city}, ${address.country}`;

  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";

  // ✅ FIX: Use actual delivery option from order data
  const deliveryOption = order.delivery_option || "courier";
  const paymentMethod =
    order.payment_method === "cod" ? "cod" : ("online" as const);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 bg-white rounded-lg border">
      {/* Order Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-md">
        <div>
          <strong className="text-sm sm:text-base">Order Number:</strong>
          <div className="font-mono text-sm sm:text-base">
            #{order.order_number}
          </div>
        </div>
        <div>
          <strong className="text-sm sm:text-base">Order Date:</strong>
          <div className="text-sm sm:text-base">
            {new Date(order.created_at).toLocaleDateString()}
          </div>
        </div>
        <div>
          <strong className="text-sm sm:text-base">Total Amount:</strong>
          <div className="font-semibold text-base sm:text-lg">
            ৳{order.total_amount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div>
        <h3 className="font-semibold mb-2 sm:mb-3 text-base sm:text-lg">
          Order Items
        </h3>
        <DataTable
          columns={productColumns}
          data={order.order_items}
          pagination={false}
          bordered={true}
          size="small"
          rowKey={(record) => record.id}
          scroll={{ x: 400 }}
        />
      </div>

      {/* Pricing Breakdown */}
      <div className="bg-gray-50 p-3 sm:p-4 rounded-md">
        <h3 className="font-semibold mb-2 sm:mb-3 text-base sm:text-lg">
          Pricing Breakdown
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm sm:text-base">
            <span>Subtotal:</span>
            <span>৳{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm sm:text-base">
            <span>Tax Amount:</span>
            <span>৳{order.tax_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm sm:text-base">
            <span>Shipping Fee:</span>
            <span>৳{order.shipping_fee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold text-sm sm:text-base">
            <span>Total Amount:</span>
            <span>৳{order.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Delivery & Payment Info */}
      <div>
        <h3 className="font-semibold mb-2 sm:mb-3 text-base sm:text-lg">
          Delivery & Payment Information
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-3 sm:p-4 bg-white border rounded-md">
          {/* Customer Information */}
          <div className="space-y-2 sm:space-y-3">
            <div>
              <strong className="block mb-1 text-sm sm:text-base">
                Customer Information:
              </strong>
              <div className="text-sm sm:text-base">
                {address.customer_name}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {order.customers?.email || "No email"}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {address.phone}
              </div>
            </div>
            <div>
              <strong className="block mb-1 text-sm sm:text-base">
                Delivery Address:
              </strong>
              <div className="text-xs sm:text-sm">{fullAddress}</div>
            </div>
            {order.notes && (
              <div>
                <strong className="block mb-1 text-sm sm:text-base">
                  Order Notes:
                </strong>
                <div className="text-xs sm:text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                  {order.notes}
                </div>
              </div>
            )}
          </div>

          {/* Status Information */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4">
              <div>
                <strong className="block mb-1 text-sm sm:text-base">
                  Order Status:
                </strong>
                <StatusTag status={order.status as StatusType} size="small" />
              </div>

              <div>
                <strong className="block mb-1 text-sm sm:text-base">
                  Payment Status:
                </strong>
                <StatusTag
                  status={order.payment_status as StatusType}
                  size="small"
                />
              </div>

              {!isCancelled && !isDelivered && (
                <div>
                  <strong className="block mb-1 text-sm sm:text-base">
                    Delivery Method:
                  </strong>
                  {/* ✅ FIX: Now using actual delivery option from order data */}
                  <StatusTag
                    status={deliveryOption as StatusType}
                    size="small"
                  />
                </div>
              )}

              <div>
                <strong className="block mb-1 text-sm sm:text-base">
                  Payment Method:
                </strong>
                <StatusTag status={paymentMethod} size="small" />
              </div>
            </div>

            {isCancelled && order.notes && (
              <div>
                <strong className="block mb-1 text-sm sm:text-base">
                  Cancellation Note:
                </strong>
                <div className="text-xs sm:text-sm text-red-600 bg-red-50 p-2 rounded">
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
