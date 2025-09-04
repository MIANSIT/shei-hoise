"use client";

import React from "react";
import DataTable from "@/app/components/admin/common/DataTable";
import { ColumnsType } from "antd/es/table";
import { Order, Product } from "@/lib/types/types";
import StatusTag, { StatusType } from "../StatusFilter/StatusTag";
import { Tooltip } from "antd";

interface Props {
  order: Order;
}

const DetailedOrderView: React.FC<Props> = ({ order }) => {
  const productColumns: ColumnsType<Product> = [
    {
      title: "Product",
      dataIndex: "title",
      key: "title",
      render: (t) => <div className="truncate max-w-[250px]">{t}</div>,
    },
    { title: "Quantity", dataIndex: "quantity", key: "quantity" },
    {
      title: "Unit Price",
      dataIndex: "price",
      key: "price",
      render: (p) => `$${p.toFixed(2)}`,
    },
    {
      title: "Total",
      key: "lineTotal",
      render: (_, p) => (
        <Tooltip
          title={`${p.price.toFixed(2)} × ${p.quantity} = $${(
            p.price * p.quantity
          ).toFixed(2)}`}
        >
          <span>${(p.price * p.quantity).toFixed(2)}</span>
        </Tooltip>
      ),
    },
    {
      title: "Delivery Cost",
      key: "deliveryCost",
      render: () => `$${order.deliveryCost.toFixed(2)}`,
    },
    {
      title: "Grand Total",
      key: "grandTotal",
      render: (_, p) => (
        <Tooltip
          title={`${(p.price * p.quantity).toFixed(2)} + ${order.deliveryCost.toFixed(2)}`}
        >
          <span>
            ${((p.price * p.quantity + order.deliveryCost).toFixed(2))}
          </span>
        </Tooltip>
      ),
    },
  ];

  const fullAddress =
    `${order.user.address || ""}${
      order.user.city ? ", " + order.user.city : ""
    }${order.user.country ? ", " + order.user.country : ""}`.trim() ||
    "Not Provided";

  const isCancelled = order.status === "cancelled";

  return (
    <div className="space-y-6 p-4  rounded-lg shadow-sm">
      {/* Products Table */}
      <div>
        <h3 className="font-semibold mb-2">Products</h3>
        <DataTable
          columns={productColumns}
          data={order.products}
          pagination={false}
          bordered={false}
          size="small"
          rowKey={(record) => record.key || record.title}
          rowClassName={() => "hover:bg-gray-100"}
        />
      </div>

      {/* Delivery & Payment Info */}
      <div>
        <h3 className="font-semibold mb-2">Delivery & Payment Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4  rounded-md">
          <div>
            <strong>Full Delivery Address:</strong>
            <p className="truncate">{fullAddress}</p>
          </div>
          <div>
            <strong>Phone Number:</strong>
            <p>{order.user.phone || "Not Provided"}</p>
          </div>

          {/* Cancel Note or Delivery/Payment statuses */}
          <div className="sm:col-span-2 flex flex-wrap gap-6 mt-2">
            {/* Always show Order Status */}
            <div>
              <strong>Order Status:&nbsp;</strong>
              <StatusTag status={order.status.toLowerCase() as StatusType} />
            </div>

            {/* Conditional: Cancel Note vs Delivery/Payment */}
            {isCancelled && order.cancelNote ? (
              <div>
                <strong>Cancel Note:&nbsp;</strong>
                <span>{order.cancelNote}</span>
              </div>
            ) : (
              <>
                <div>
                  <strong>Delivery Method:&nbsp;</strong>
                  <StatusTag
                    status={order.deliveryOption.toLowerCase() as StatusType}
                  />
                </div>
                <div>
                  <strong>Payment Method:&nbsp;</strong>
                  <StatusTag
                    status={order.paymentMethod.toLowerCase() as StatusType}
                  />
                </div>
                <div>
                  <strong>Payment Status:&nbsp;</strong>
                  <StatusTag
                    status={order.paymentStatus.toLowerCase() as StatusType}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedOrderView;
