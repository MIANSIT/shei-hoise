"use client";

import React, { useState } from "react";
import { Button, Modal, Alert, Progress, Select } from "antd";
import { StoreOrder } from "@/lib/types/order";
import { createPathaoShipment } from "@/lib/queries/pathao/createPathaoShipment";
import {
  getPathaoConnectedAccounts,
  type PathaoAccountStatus,
} from "@/lib/queries/pathao/getPathaoConnectedAccounts";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";

interface Props {
  selectedOrders: StoreOrder[];
  onSuccess: () => void;
  onClearSelection: () => void;
}

interface ShipResult {
  orderNumber: string;
  success: boolean;
  error?: string;
}

// Loops the single-order Create Order call once per selected order — not
// Pathao's actual Bulk Order endpoint, which returns no consignment_ids and
// can't be tied back to individual orders. See the reference doc for why.
const BulkPathaoShipmentAction: React.FC<Props> = ({
  selectedOrders,
  onSuccess,
  onClearSelection,
}) => {
  const t = useTranslation();
  const n = useLocalNum();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ShipResult[] | null>(null);
  const [accounts, setAccounts] = useState<PathaoAccountStatus[] | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();

  const eligible = selectedOrders.filter((o) => !o.pathao_consignment_id);
  const alreadyShipped = selectedOrders.length - eligible.length;

  const openModal = async () => {
    setResults(null);
    setProgress(0);
    setSelectedAccountId(undefined);
    setIsModalOpen(true);

    if (eligible.length > 0) {
      const all = await getPathaoConnectedAccounts(eligible[0].store_id);
      const connectedOnly = all.filter((a) => a.connected);
      setAccounts(connectedOnly);
      if (connectedOnly.length === 1) setSelectedAccountId(connectedOnly[0].id);
    }
  };

  const handleShipAll = async () => {
    if (eligible.length === 0 || !selectedAccountId) return;
    setProcessing(true);

    const outcomes: ShipResult[] = [];
    for (let i = 0; i < eligible.length; i++) {
      const order = eligible[i];
      const recipientName =
        order.shipping_address?.customer_name || order.customers?.first_name || "";
      const recipientPhone =
        order.shipping_address?.phone || order.customers?.phone || "";
      const recipientAddress =
        (order.shipping_address?.address_line_1 || order.shipping_address?.address || "") +
        (order.shipping_address?.city ? `, ${order.shipping_address.city}` : "");

      try {
        const result = await createPathaoShipment(
          selectedAccountId,
          order.id,
          order.order_number,
          {
            recipientName,
            recipientPhone,
            recipientAddress,
            itemWeight: 0.5,
            itemQuantity: order.order_items?.length || 1,
            itemDescription: order.order_items?.map((it) => it.product_name).join(", "),
            amountToCollect: order.payment_status === "paid" ? 0 : order.total_amount,
          },
        );

        outcomes.push(
          result.success
            ? { orderNumber: order.order_number, success: true }
            : { orderNumber: order.order_number, success: false, error: result.error },
        );
      } catch (err) {
        outcomes.push({
          orderNumber: order.order_number,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
      setProgress(Math.round(((i + 1) / eligible.length) * 100));
    }

    setResults(outcomes);
    setProcessing(false);
    onSuccess();
  };

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results?.filter((r) => !r.success).length ?? 0;
  const noAccountsConnected = accounts !== null && accounts.length === 0;

  return (
    <>
      <Button
        onClick={() => {
          void openModal();
        }}
        disabled={selectedOrders.length === 0}
        className="w-full sm:w-auto"
        size="middle"
      >
        {t.admin.bulkShipBtn} ({n(selectedOrders.length)})
      </Button>

      <Modal
        title={t.admin.bulkShipTitle}
        open={isModalOpen}
        onCancel={() => {
          if (processing) return;
          setIsModalOpen(false);
          if (results) onClearSelection();
        }}
        footer={null}
        width="90%"
        style={{ maxWidth: 480 }}
      >
        {!results ? (
          <div className="space-y-4">
            <Alert
              type="info"
              showIcon
              title={t.admin.bulkShipInfoTitle}
              description={t.admin.bulkShipInfoDesc}
            />
            {alreadyShipped > 0 && (
              <Alert
                type="warning"
                showIcon
                description={`${n(alreadyShipped)} ${t.admin.bulkShipAlreadySkipped}`}
              />
            )}
            {noAccountsConnected ? (
              <Alert type="error" showIcon description={t.admin.pathaoNotConnectedError} />
            ) : (
              <>
                {accounts && accounts.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      {t.admin.pathaoShipFrom}
                    </label>
                    <Select
                      className="w-full"
                      placeholder={t.admin.pathaoSelectAccount}
                      value={selectedAccountId}
                      onChange={setSelectedAccountId}
                      options={accounts.map((a) => ({
                        value: a.id,
                        label: `${a.label} — ${a.pathaoStoreName}`,
                      }))}
                    />
                  </div>
                )}
                <p className="text-sm">
                  {t.admin.bulkShipWillCreate} <strong>{n(eligible.length)}</strong>{" "}
                  {t.admin.bulkShipShipments}
                </p>
              </>
            )}
            {processing && <Progress percent={progress} />}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setIsModalOpen(false)}
                disabled={processing}
                className="flex-1"
              >
                {t.admin.bulkCancelBtn}
              </Button>
              <Button
                type="primary"
                onClick={handleShipAll}
                loading={processing}
                disabled={eligible.length === 0 || !selectedAccountId}
                className="flex-1"
              >
                {t.admin.bulkShipConfirmBtn}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Alert
              type={failCount === 0 ? "success" : "warning"}
              showIcon
              description={`${n(successCount)} ${t.admin.bulkShipOf} ${n(results.length)} ${t.admin.bulkShipCreatedOk}`}
            />
            {failCount > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {results
                  .filter((r) => !r.success)
                  .map((r) => (
                    <div
                      key={r.orderNumber}
                      className="text-xs p-2 rounded bg-red-50 text-red-700"
                    >
                      #{r.orderNumber} — {r.error}
                    </div>
                  ))}
              </div>
            )}
            <Button
              type="primary"
              onClick={() => {
                setIsModalOpen(false);
                onClearSelection();
              }}
              className="w-full"
            >
              {t.admin.bulkShipDone}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
};

export default BulkPathaoShipmentAction;
