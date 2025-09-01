"use client";

import React from "react";
import DataTable from "@/app/components/admin/common/DataTable";
import { ColumnsType } from "antd/es/table";
import { Order, Product } from "@/lib/types/types";
import StatusTag, { StatusType } from "./StatusTag";

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
      title: "Grand Total",
      key: "lineTotal",
      render: (_, p) => `$${(p.price * p.quantity).toFixed(2)}`,
    },
  ];

  const fullAddress =
    `${order.user.address || ""}${
      order.user.city ? ", " + order.user.city : ""
    }${order.user.country ? ", " + order.user.country : ""}`.trim() ||
    "Not Provided";

  return (
    <div className="space-y-6 p-4 bg-white rounded-lg shadow-sm">
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
        {/* Delivery & Payment Info */}
        <div>
          <h3 className="font-semibold mb-2">Delivery & Payment Info</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
            <div>
              <strong>Full Delivery Address:</strong>
              <p className="truncate">{fullAddress}</p>
            </div>
            <div>
              <strong>Phone Number:</strong>
              <p>{order.user.phone || "Not Provided"}</p>
            </div>

            {/* Single row for delivery/payment statuses */}
            <div className="sm:col-span-2 flex flex-wrap gap-6 mt-2">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedOrderView;
