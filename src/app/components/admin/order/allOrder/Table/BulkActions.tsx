// app/components/admin/order/allOrder/BulkActions.tsx
"use client";

import React, { useState } from "react";
import { Button, Select, Modal, App, Space, Tag, Alert } from "antd";
import { StoreOrder } from "@/lib/types/order";
import { OrderStatus, PaymentStatus } from "@/lib/types/enums";
import dataService from "@/lib/queries/dataService";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

interface Props {
  selectedOrders: StoreOrder[];
  onSuccess: () => void;
  onClearSelection: () => void;
}

type UpdateField = "status" | "payment_status" | "payment_method";

interface UpdatesState {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  payment_method?: string;
}

const BulkActions: React.FC<Props> = ({
  selectedOrders,
  onSuccess,
  onClearSelection,
}) => {
  const { message, modal } = App.useApp();
  const t = useTranslation();
  const n = useLocalNum();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updates, setUpdates] = useState<UpdatesState>({
    status: undefined,
    payment_status: undefined,
    payment_method: "cod",
  });

  const STATUS_OPTIONS = [
    { value: "pending", label: t.admin.bulkPending },
    { value: "confirmed", label: t.admin.bulkConfirmed },
    { value: "shipped", label: t.admin.bulkShipped },
    { value: "delivered", label: t.admin.bulkDelivered },
    { value: "cancelled", label: t.admin.bulkCancelled },
  ];

  const PAYMENT_STATUS_OPTIONS = [
    { value: "pending", label: t.admin.bulkPending },
    { value: "paid", label: t.admin.bulkPaid },
    { value: "failed", label: t.admin.bulkFailed },
    { value: "refunded", label: t.admin.bulkRefunded },
  ];

  const PAYMENT_METHODS = [
    { value: "cod", label: t.admin.bulkCod },
  ];

  const handleUpdate = async () => {
    if (Object.values(updates).every((val) => val === undefined)) {
      message.warning(t.admin.bulkWarning);
      return;
    }

    setLoading(true);
    try {
      const result = await dataService.bulkUpdateOrders({
        orderIds: selectedOrders.map((order) => order.id),
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
          payment_method: "cod",
        });
        onSuccess();
        onClearSelection();
      } else {
        message.error(result.error || t.admin.bulkUpdateFailed);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t.admin.bulkUpdateFailed;
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showConfirmModal = () => {
    if (Object.values(updates).every((val) => val === undefined)) {
      message.warning(t.admin.bulkWarning);
      return;
    }

    modal.confirm({
      title: `${t.admin.bulkUpdateTitle} ${n(selectedOrders.length)} ${t.admin.bulkOrdersSelected}?`,
      content: (
        <div className="p-1">
          <Alert
            title={t.admin.bulkActionTitle}
            description={t.admin.bulkActionDesc}
            type="info"
            showIcon
            className="mb-3"
          />
          <div className="space-y-3 ">
            {updates.status && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mt-4">
                <span className="font-medium text-sm">{t.admin.bulkOrderStatusLabel}</span>
                <Tag color="blue" className="w-fit">
                  {STATUS_OPTIONS.find((s) => s.value === updates.status)?.label}
                </Tag>
              </div>
            )}
            {updates.payment_status && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm">{t.admin.bulkPaymentStatusLabel}</span>
                <Tag color="green" className="w-fit">
                  {PAYMENT_STATUS_OPTIONS.find((s) => s.value === updates.payment_status)?.label}
                </Tag>
              </div>
            )}
            {updates.payment_method && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm">{t.admin.bulkPaymentMethodLabel}</span>
                <Tag color="purple" className="w-fit">
                  {PAYMENT_METHODS.find((s) => s.value === updates.payment_method)?.label}
                </Tag>
              </div>
            )}
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 text-center">
              {t.admin.bulkNoteText}
            </p>
          </div>
        </div>
      ),
      okText: t.admin.bulkUpdateOrdersBtn,
      okType: "primary",
      okButtonProps: { loading },
      cancelText: t.admin.bulkCancelBtn,
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
        {t.admin.bulkUpdateBtn} ({n(selectedOrders.length)})
      </Button>

      <Modal
        title={
          <div className="text-base sm:text-lg font-semibold">
            {t.admin.bulkUpdateTitle} - {n(selectedOrders.length)} {t.admin.bulkOrdersSelected}
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setUpdates({
            status: undefined,
            payment_status: undefined,
            payment_method: "cod",
          });
        }}
        footer={null}
        width="90%"
        style={{ maxWidth: "500px" }}
        className="bulk-actions-modal"
      >
        <div className="space-y-4 sm:space-y-6">
          <Alert
            title={t.admin.bulkInstructionsTitle}
            description={t.admin.bulkInstructionsDesc}
            type="info"
            showIcon
            className="text-xs sm:text-sm"
          />

          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">
                {t.admin.bulkOrderStatusLabel}
                {updates.status && (
                  <span className="text-green-600 ml-2">{t.admin.bulkChecked}</span>
                )}
              </label>
              <Select
                placeholder={t.admin.bulkKeepCurrentStatus}
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
                {t.admin.bulkPaymentStatusLabel}
                {updates.payment_status && (
                  <span className="text-green-600 ml-2">{t.admin.bulkChecked}</span>
                )}
              </label>
              <Select
                placeholder={t.admin.bulkKeepCurrentStatus}
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
                {t.admin.bulkPaymentMethodLabel}
                {updates.payment_method && (
                  <span className="text-green-600 ml-2">{t.admin.bulkChecked}</span>
                )}
              </label>
              <Select
                placeholder={t.admin.bulkKeepCurrentMethod}
                value={updates.payment_method}
                defaultValue="cod"
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
              {t.admin.bulkSelectedOrders} ({n(selectedOrders.length)}):
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
                    +{n(selectedOrders.length - 15)} {t.admin.bulkMore}
                  </Tag>
                )}
              </Space>
            </div>
          </div>

          {hasUpdates && (
            <Alert
              title={t.admin.bulkReadyTitle}
              description={t.admin.bulkReadyDesc}
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
              {t.admin.bulkCancelBtn}
            </Button>
            <Button
              type="primary"
              onClick={showConfirmModal}
              disabled={!hasUpdates}
              className="w-full sm:w-1/2 h-12 sm:h-10 text-sm sm:text-base"
              size="large"
            >
              {t.admin.bulkReviewChanges}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BulkActions;
