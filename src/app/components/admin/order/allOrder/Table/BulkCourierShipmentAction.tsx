"use client";

import React, { useState, useMemo } from "react";
import { Button, Modal, Alert, Progress, Select } from "antd";
import { StoreOrder } from "@/lib/types/order";
import { createPathaoShipment } from "@/lib/queries/pathao/createPathaoShipment";
import { createSteadfastShipment } from "@/lib/queries/steadfast/createSteadfastShipment";
import {
  getConnectedCourierAccounts,
  type CourierAccountStatus,
} from "@/lib/queries/courier/getConnectedCourierAccounts";
import { getDeliveryCouriers } from "@/lib/queries/deliveryCouriers/getDeliveryCouriers";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
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
// either courier's actual Bulk Order endpoint, which returns no
// consignment_ids and can't be tied back to individual orders.
//
// Which courier ships each order is decided by that order's own "Delivery
// Courier" field, not a picker here — this only asks which connected
// account to use per courier, and only when a courier has more than one.
const BulkCourierShipmentAction: React.FC<Props> = ({
  selectedOrders,
  onSuccess,
  onClearSelection,
}) => {
  const t = useTranslation();
  const n = useLocalNum();
  const { allowed: courierTrackingAllowed } = useFeatureGate(
    selectedOrders[0]?.store_id,
    "courier_tracking",
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ShipResult[] | null>(null);
  const [accounts, setAccounts] = useState<CourierAccountStatus[] | null>(null);
  const [pathaoAccountId, setPathaoAccountId] = useState<string | undefined>();
  const [steadfastAccountId, setSteadfastAccountId] = useState<string | undefined>();
  const [pathaoName, setPathaoName] = useState("");
  const [steadfastName, setSteadfastName] = useState("");

  // Selection can run into the hundreds, and this whole chain re-filters/
  // re-maps every one of them — memoized so it only recomputes when the
  // selection, the connected accounts, or the feature gate actually change.
  const {
    notYetShipped,
    alreadyShipped,
    pathaoOrders,
    steadfastOrders,
    skipped,
    pathaoAccounts,
    steadfastAccounts,
    eligible,
    unreachable,
    needsPathaoPicker,
    needsSteadfastPicker,
  } = useMemo(() => {
    const notYetShipped = selectedOrders.filter((o) => !o.courier_consignment_id);
    const alreadyShipped = selectedOrders.length - notYetShipped.length;

    const pathaoOrders = notYetShipped.filter((o) => o.courier === "pathao");
    const steadfastOrders = notYetShipped.filter((o) => o.courier === "steadfast");
    const skipped = notYetShipped.length - pathaoOrders.length - steadfastOrders.length;

    // Treated as having zero accounts (never just disabling the button) so
    // the same "unreachable" messaging path below applies —
    // courierTrackingAllowed just swaps in the correct explanation for why.
    const pathaoAccounts = courierTrackingAllowed
      ? (accounts ?? []).filter((a) => a.courier === "pathao" && a.connected)
      : [];
    const steadfastAccounts = courierTrackingAllowed
      ? (accounts ?? []).filter((a) => a.courier === "steadfast" && a.connected)
      : [];

    const eligible = [
      ...(pathaoAccounts.length > 0 ? pathaoOrders : []),
      ...(steadfastAccounts.length > 0 ? steadfastOrders : []),
    ];
    const unreachable =
      (pathaoOrders.length > 0 && pathaoAccounts.length === 0 ? pathaoOrders.length : 0) +
      (steadfastOrders.length > 0 && steadfastAccounts.length === 0 ? steadfastOrders.length : 0);

    const needsPathaoPicker = pathaoOrders.length > 0 && pathaoAccounts.length > 1;
    const needsSteadfastPicker = steadfastOrders.length > 0 && steadfastAccounts.length > 1;

    return {
      notYetShipped,
      alreadyShipped,
      pathaoOrders,
      steadfastOrders,
      skipped,
      pathaoAccounts,
      steadfastAccounts,
      eligible,
      unreachable,
      needsPathaoPicker,
      needsSteadfastPicker,
    };
  }, [selectedOrders, accounts, courierTrackingAllowed]);

  const pathaoAccountOptions = useMemo(
    () => pathaoAccounts.map((a) => ({ value: a.id, label: a.label })),
    [pathaoAccounts],
  );
  const steadfastAccountOptions = useMemo(
    () => steadfastAccounts.map((a) => ({ value: a.id, label: a.label })),
    [steadfastAccounts],
  );

  const canShip =
    eligible.length > 0 &&
    (pathaoOrders.length === 0 || pathaoAccounts.length === 0 || !!pathaoAccountId) &&
    (steadfastOrders.length === 0 || steadfastAccounts.length === 0 || !!steadfastAccountId);

  const openModal = async () => {
    setResults(null);
    setProgress(0);
    setPathaoAccountId(undefined);
    setSteadfastAccountId(undefined);
    setIsModalOpen(true);

    if (notYetShipped.length > 0) {
      const storeId = notYetShipped[0].store_id;
      const all = await getConnectedCourierAccounts(storeId);
      setAccounts(all);
      const pathao = all.filter((a) => a.courier === "pathao" && a.connected);
      const steadfast = all.filter((a) => a.courier === "steadfast" && a.connected);
      if (pathao.length === 1) setPathaoAccountId(pathao[0].id);
      if (steadfast.length === 1) setSteadfastAccountId(steadfast[0].id);

      const couriers = await getDeliveryCouriers(storeId);
      setPathaoName(couriers.find((c) => c.type === "pathao")?.name ?? "");
      setSteadfastName(couriers.find((c) => c.type === "steadfast")?.name ?? "");
    }
  };

  const handleShipAll = async () => {
    if (!canShip) return;
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
      const codAmount = order.payment_status === "paid" ? 0 : order.total_amount;

      // Sum of every line's quantity, not the number of distinct lines.
      const itemQuantity = order.order_items?.reduce((sum, it) => sum + it.quantity, 0) || 1;
      // Sum of (per-unit weight × quantity), clamped to Pathao's 0.5–10kg
      // range, falling back to 0.5 when nothing in the order has a
      // recorded weight yet — same default as the single-shipment panel.
      const calculatedWeight =
        order.order_items?.reduce((sum, it) => sum + (it.weight ?? 0) * it.quantity, 0) || 0;
      const itemWeight = calculatedWeight > 0 ? Math.min(10, Math.max(0.5, calculatedWeight)) : 0.5;

      try {
        const result =
          order.courier === "pathao"
            ? await createPathaoShipment(pathaoAccountId!, order.id, order.order_number, {
                recipientName,
                recipientPhone,
                recipientAddress,
                itemWeight,
                itemQuantity,
                itemDescription: order.order_items?.map((it) => it.product_name).join(", "),
                amountToCollect: codAmount,
              })
            : await createSteadfastShipment(steadfastAccountId!, order.id, order.order_number, {
                recipientName,
                recipientPhone,
                recipientAddress,
                codAmount,
                itemDescription: order.order_items?.map((it) => it.product_name).join(", "),
              });

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
            {skipped > 0 && (
              <Alert type="warning" showIcon description={t.admin.bulkShipCourierSkipped.replace("{count}", n(skipped))} />
            )}
            {unreachable > 0 && (
              <Alert
                type="error"
                showIcon
                description={
                  courierTrackingAllowed
                    ? t.admin.bulkShipNoAccountSkipped.replace("{count}", n(unreachable))
                    : t.admin.courierFeatureLocked
                }
              />
            )}
            {eligible.length === 0 ? (
              <Alert type="error" showIcon description={t.admin.pathaoNotConnectedError} />
            ) : (
              <>
                {needsPathaoPicker && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      {pathaoName || t.admin.pathaoCardTitle} — {t.admin.pathaoShipFrom}
                    </label>
                    <Select
                      className="w-full"
                      placeholder={t.admin.pathaoSelectAccount}
                      value={pathaoAccountId}
                      onChange={setPathaoAccountId}
                      options={pathaoAccountOptions}
                    />
                  </div>
                )}
                {needsSteadfastPicker && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      {steadfastName || t.admin.steadfastCardTitle} — {t.admin.pathaoShipFrom}
                    </label>
                    <Select
                      className="w-full"
                      placeholder={t.admin.pathaoSelectAccount}
                      value={steadfastAccountId}
                      onChange={setSteadfastAccountId}
                      options={steadfastAccountOptions}
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
                disabled={!canShip}
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

export default BulkCourierShipmentAction;
