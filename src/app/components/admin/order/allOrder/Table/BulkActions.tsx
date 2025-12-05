// app/components/admin/order/allOrder/BulkActions.tsx
"use client";

import React, { useState } from "react";
import { Button, Select, Modal, App, Space, Tag, Alert } from "antd";
import { StoreOrder } from "@/lib/types/order"; // Import StoreOrder
import { OrderStatus, PaymentStatus } from "@/lib/types/enums"; // Import StoreOrder
import dataService from "@/lib/queries/dataService";

interface Props {
  selectedOrders: StoreOrder[]; // Change from string[] to StoreOrder[]
  onSuccess: () => void;
  onClearSelection: () => void;
}

type UpdateField = "status" | "payment_status" | "payment_method";

interface UpdatesState {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  payment_method?: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery" },
  // { value: "online", label: "Online Payment" },
];

const BulkActions: React.FC<Props> = ({
  selectedOrders,
  onSuccess,
  onClearSelection,
}) => {
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updates, setUpdates] = useState<UpdatesState>({
    status: undefined,
    payment_status: undefined,
    payment_method: "cod", // Set "cod" as default
  });

  const handleUpdate = async () => {
    if (Object.values(updates).every((val) => val === undefined)) {
      message.warning("Please select at least one field to update");
      return;
    }

    setLoading(true);
    try {
      const result = await dataService.bulkUpdateOrders({
        orderIds: selectedOrders.map((order) => order.id), // Extract IDs for API call
        status: updates.status,
        payment_status: updates.payment_status,
        payment_method: updates.payment_method,
      });

      if (result.success) {
        message.success(
          result.message || `Updated ${result.updatedCount} orders successfully`
        );
        setIsModalOpen(false);
        setUpdates({
          status: undefined,
          payment_status: undefined,
          payment_method: "cod", // Reset to "cod" when modal closes
        });
        onSuccess();
        onClearSelection();
      } else {
        message.error(result.error || "Failed to update orders");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update orders";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showConfirmModal = () => {
    if (Object.values(updates).every((val) => val === undefined)) {
      message.warning("Please select at least one field to update");
      return;
    }

    modal.confirm({
      title: `Update ${selectedOrders.length} Orders?`,
      content: (
        <div className="p-1">
          <Alert
            message="Bulk Update Action"
            description="This will update all selected orders with the following changes:"
            type="info"
            showIcon
            className="mb-3"
          />
          <div className="space-y-3 ">
            {updates.status && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mt-4">
                <span className="font-medium text-sm">Order Status:</span>
                <Tag color="blue" className="w-fit">
                  {
                    STATUS_OPTIONS.find((s) => s.value === updates.status)
                      ?.label
                  }
                </Tag>
              </div>
            )}
            {updates.payment_status && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm">Payment Status:</span>
                <Tag color="green" className="w-fit">
                  {
                    PAYMENT_STATUS_OPTIONS.find(
                      (s) => s.value === updates.payment_status
                    )?.label
                  }
                </Tag>
              </div>
            )}
            {updates.payment_method && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm">Payment Method:</span>
                <Tag color="purple" className="w-fit">
                  {
                    PAYMENT_METHODS.find(
                      (s) => s.value === updates.payment_method
                    )?.label
                  }
                </Tag>
              </div>
            )}
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 text-center">
              <strong>Note:</strong> This action cannot be undone. Inventory
              will be automatically adjusted for status changes.
            </p>
          </div>
        </div>
      ),
      okText: "Update Orders",
      okType: "primary",
      okButtonProps: { loading },
      cancelText: "Cancel",
      onOk: handleUpdate,
      width: "90%",
      style: { maxWidth: "500px" },
    });
  };

  const handleChange = (
    field: UpdateField,
    value: OrderStatus | PaymentStatus | string | undefined
  ) => {
    setUpdates((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const hasUpdates = Object.values(updates).some((val) => val !== undefined);

  return (
    <>
      <Button
        type="primary"
        onClick={() => setIsModalOpen(true)}
        disabled={selectedOrders.length === 0}
        className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
        size="middle"
      >
        Bulk Update ({selectedOrders.length})
      </Button>

      <Modal
        title={
          <div className="text-base sm:text-lg font-semibold">
            Bulk Update - {selectedOrders.length} Orders Selected
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setUpdates({
            status: undefined,
            payment_status: undefined,
            payment_method: "cod", // Reset to "cod" when modal closes
          });
        }}
        footer={null}
        width="90%"
        style={{ maxWidth: "500px" }}
        className="bulk-actions-modal"
      >
        <div className="space-y-4 sm:space-y-6">
          <Alert
            message="Bulk Update Instructions"
            description="Select the fields you want to update for all selected orders. Leave a field empty to keep its current value."
            type="info"
            showIcon
            className="text-xs sm:text-sm"
          />

          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">
                Order Status
                {updates.status && (
                  <span className="text-green-600 ml-2">✓ Selected</span>
                )}
              </label>
              <Select
                placeholder="Keep current status"
                value={updates.status}
                onChange={(value: OrderStatus) => handleChange("status", value)}
                options={STATUS_OPTIONS}
                className="w-full"
                size="middle"
                allowClear
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">
                Payment Status
                {updates.payment_status && (
                  <span className="text-green-600 ml-2">✓ Selected</span>
                )}
              </label>
              <Select
                placeholder="Keep current status"
                value={updates.payment_status}
                onChange={(value: PaymentStatus) =>
                  handleChange("payment_status", value)
                }
                options={PAYMENT_STATUS_OPTIONS}
                className="w-full"
                size="middle"
                allowClear
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">
                Payment Method
                {updates.payment_method && (
                  <span className="text-green-600 ml-2">✓ Selected</span>
                )}
              </label>
              <Select
                placeholder="Keep current method"
                value={updates.payment_method}
                defaultValue="cod" // Set default value
                onChange={(value: string) =>
                  handleChange("payment_method", value)
                }
                options={PAYMENT_METHODS}
                className="w-full"
                size="middle"
                allowClear
              />
            </div>
          </div>

          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border">
            <p className="text-sm sm:text-base font-medium mb-2 sm:mb-3">
              Selected Orders ({selectedOrders.length}):
            </p>
            <div className="max-h-32 overflow-y-auto">
              <Space wrap size={[4, 8]} className="w-full">
                {selectedOrders.slice(0, 15).map((order) => (
                  <Tag
                    key={order.id}
                    className="text-xs mb-1 break-all"
                    style={{ maxWidth: "100%" }}
                  >
                    #{order.order_number}
                  </Tag>
                ))}
                {selectedOrders.length > 15 && (
                  <Tag className="text-xs">
                    +{selectedOrders.length - 15} more
                  </Tag>
                )}
              </Space>
            </div>
          </div>

          {hasUpdates && (
            <Alert
              message="Ready to Update"
              description="Click 'Review Changes' to confirm the bulk update operation."
              type="success"
              showIcon
              className="text-xs sm:text-sm"
            />
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4 border-t border-gray-200">
            <Button
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-1/2 h-12 sm:h-10 text-sm sm:text-base"
              size="large"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={showConfirmModal}
              disabled={!hasUpdates}
              className="w-full sm:w-1/2 h-12 sm:h-10 text-sm sm:text-base"
              size="large"
            >
              Review Changes
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BulkActions;
