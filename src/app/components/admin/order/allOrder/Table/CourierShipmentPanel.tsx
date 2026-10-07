"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
// antd Modal + Select, not the Radix ones: this panel renders *inside* an antd
// Drawer, and antd v6 assigns popup z-indexes dynamically (each nested popup
// gets a higher one). A Radix overlay has a single fixed z-index, so it can end
// up beneath the Drawer while still putting `pointer-events: none` on <body> —
// the dialog is invisible and the page stops responding to every click. Keeping
// Drawer and Modal in the same library lets antd stack them itself, which is
// also what BulkCourierShipmentAction already does.
import { Modal, Select } from "antd";
import { Truck, ExternalLink, RefreshCw, AlertCircle, History } from "lucide-react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import {
  getConnectedCourierAccounts,
  type CourierAccountStatus,
} from "@/lib/queries/courier/getConnectedCourierAccounts";
import { createPathaoShipment } from "@/lib/queries/pathao/createPathaoShipment";
import { refreshPathaoOrderStatus } from "@/lib/queries/pathao/getPathaoOrderStatus";
import { createSteadfastShipment } from "@/lib/queries/steadfast/createSteadfastShipment";
import { refreshSteadfastOrderStatus } from "@/lib/queries/steadfast/getSteadfastOrderStatus";
import { createPaperflyShipment } from "@/lib/queries/paperfly/createPaperflyShipment";
import { refreshPaperflyOrderStatus } from "@/lib/queries/paperfly/getPaperflyOrderStatus";
import { cancelPaperflyShipment } from "@/lib/queries/paperfly/cancelPaperflyShipment";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { isCourierStatusCancelled } from "@/lib/utils/courierStatus";
import { PAPERFLY_CANCEL_ENABLED } from "@/lib/config/courierAvailability";
import { getDeliveryCouriers } from "@/lib/queries/deliveryCouriers/getDeliveryCouriers";
import {
  getOrderShipmentHistory,
  type OrderShipmentHistoryEntry,
} from "@/lib/queries/courier/getOrderShipmentHistory";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { getCourierStatusStyle, prettifyCourierStatus } from "@/lib/utils/courierStatusDisplay";
import type { StoreOrder } from "@/lib/types/order";
import { buildShipmentItemDescription } from "@/lib/utils/shipmentItemDescription";

interface CourierShipmentPanelProps {
  order: StoreOrder;
  onShipped: (consignmentId: string, orderStatus: string) => void;
}

function buildPathaoTrackingUrl(consignmentId: string, phone: string): string {
  return `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(
    consignmentId,
  )}&phone=${encodeURIComponent(phone)}`;
}

/**
 * Which courier ships this order is decided by the order's own "Delivery
 * Courier" field (set on Add/Edit Order or the inline row editor) — not a
 * choice made here. Pathao/Steadfast show their own create/track/refresh UI;
 * anything else (a custom/manual courier, or none picked) shows nothing for
 * the active-shipment part, since there's no API to call. Past shipments
 * (from a courier that was switched away from) still show below regardless,
 * since that's real history, not something that should disappear.
 */
export default function CourierShipmentPanel({
  order,
  onShipped,
}: CourierShipmentPanelProps) {
  const notify = useSheiNotification();
  const t = useTranslation();
  const { allowed: courierTrackingAllowed } = useFeatureGate(order.store_id, "courier_tracking");

  const isPathao = order.courier === "pathao";
  const isSteadfast = order.courier === "steadfast";
  const isPaperfly = order.courier === "paperfly";
  const isApiCourier = isPathao || isSteadfast || isPaperfly;

  const [accounts, setAccounts] = useState<CourierAccountStatus[] | null>(null);
  const [courierName, setCourierName] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<OrderShipmentHistoryEntry[]>([]);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { can } = usePermissions();

  const recipientName =
    order.shipping_address?.customer_name || order.customers?.first_name || "";
  const recipientPhone =
    order.shipping_address?.phone || order.customers?.phone || "";
  const recipientAddress =
    (order.shipping_address?.address_line_1 || order.shipping_address?.address || "") +
    (order.shipping_address?.city ? `, ${order.shipping_address.city}` : "");

  // Sum of every line's quantity, not the number of distinct product
  // lines — an order with one line at quantity 3 is 3 items, not 1.
  const totalItemQuantity =
    order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 1;

  // Sum of (per-unit weight × quantity) across every line, clamped to
  // Pathao's accepted 0.5–10kg range. Falls back to 0.5 when no product in
  // the order has a weight recorded yet, same as the old static default.
  const calculatedWeight =
    order.order_items?.reduce((sum, item) => sum + (item.weight ?? 0) * item.quantity, 0) || 0;
  const defaultWeight = calculatedWeight > 0 ? Math.min(10, Math.max(0.5, calculatedWeight)) : 0.5;

  const [name, setName] = useState(recipientName);
  const [phone, setPhone] = useState(recipientPhone);
  const [address, setAddress] = useState(recipientAddress);
  const [weight, setWeight] = useState(String(defaultWeight));
  const [instruction, setInstruction] = useState("");
  // Defaults to the order's full total — staff can still edit this down
  // (e.g. to 0) for an order that was genuinely paid in full up front, but
  // it should never be silently assumed on their behalf.
  const [amountToCollect, setAmountToCollect] = useState(order.total_amount);

  const accountsForCourier = (accounts ?? []).filter(
    (a) => a.courier === order.courier && a.connected,
  );

  // One effect, three requests in parallel. Previously these ran as three
  // separate awaited chains, so opening the drawer serialised a round trip per
  // call before the panel settled. `cancelled` stops a slow response from a
  // drawer the user has already moved on from writing into this one's state.
  useEffect(() => {
    let cancelled = false;

    const historyPromise = getOrderShipmentHistory(order.id);
    const accountsPromise = isApiCourier
      ? getConnectedCourierAccounts(order.store_id)
      : Promise.resolve(null);
    const couriersPromise = isApiCourier
      ? getDeliveryCouriers(order.store_id)
      : Promise.resolve(null);

    Promise.all([historyPromise, accountsPromise, couriersPromise])
      .then(([historyRows, allAccounts, allCouriers]) => {
        if (cancelled) return;

        setHistory(historyRows);

        if (allAccounts) {
          setAccounts(allAccounts);
          const connected = allAccounts.filter(
            (a) => a.courier === order.courier && a.connected,
          );
          // Only auto-select when there is exactly one choice; with several,
          // the picker stays empty so staff pick deliberately.
          if (connected.length === 1) setSelectedAccountId(connected[0].id);
        }

        if (allCouriers) {
          setCourierName(allCouriers.find((c) => c.type === order.courier)?.name ?? "");
        }
      })
      .catch(() => {
        // A failed lookup leaves the panel in its empty state rather than
        // throwing through the drawer — the create button stays disabled
        // because no account gets selected.
      });

    return () => {
      cancelled = true;
    };
  }, [order.id, order.store_id, order.courier, order.courier_consignment_id, isApiCourier]);

  const courierLabel =
    courierName ||
    (isSteadfast
      ? t.admin.steadfastCardTitle
      : isPaperfly
        ? t.admin.paperflyCardTitle
        : t.admin.pathaoCardTitle);

  const handleCreateShipment = async () => {
    if (!selectedAccountId) return;
    setSubmitting(true);
    try {
      const result = isPathao
        ? await createPathaoShipment(selectedAccountId, order.id, order.order_number, {
            recipientName: name.trim(),
            recipientPhone: phone.trim(),
            recipientAddress: address.trim(),
            itemWeight: Number(weight),
            itemQuantity: totalItemQuantity,
            itemDescription: buildShipmentItemDescription(order.order_items),
            specialInstruction: instruction.trim() || undefined,
            amountToCollect: Number(amountToCollect),
          })
        : isPaperfly
          ? await createPaperflyShipment(selectedAccountId, order.id, order.order_number, {
              recipientName: name.trim(),
              recipientPhone: phone.trim(),
              recipientAddress: address.trim(),
              codAmount: Number(amountToCollect),
              weight: Number(weight),
              itemDescription: buildShipmentItemDescription(order.order_items),
            })
          : await createSteadfastShipment(selectedAccountId, order.id, order.order_number, {
              recipientName: name.trim(),
              recipientPhone: phone.trim(),
              recipientAddress: address.trim(),
              codAmount: Number(amountToCollect),
              note: instruction.trim() || undefined,
              itemDescription: buildShipmentItemDescription(order.order_items),
            });

      if (!result.success || !result.consignmentId || !result.orderStatus) {
        notify.error(result.error ?? t.admin.pathaoShipmentFailed);
        return;
      }

      notify.success(t.admin.pathaoShipmentCreatedOk);
      onShipped(result.consignmentId, result.orderStatus);
      setModalOpen(false);
    } catch (err) {
      // A server action that throws (rather than returning {success:false})
      // used to reject with nothing caught here: the spinner cleared, the
      // modal stayed open and no message appeared, so staff retried a
      // request that had already reached the courier. Surface it instead.
      console.error("Courier shipment creation failed:", err);
      notify.error(err instanceof Error ? err.message : t.admin.pathaoShipmentFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!order.courier_consignment_id || !order.courier_credential_id) return;
    setRefreshing(true);
    try {
      const result = isSteadfast
        ? await refreshSteadfastOrderStatus(
            order.courier_credential_id,
            order.id,
            order.courier_consignment_id,
          )
        : isPaperfly
          ? await refreshPaperflyOrderStatus(
              order.courier_credential_id,
              order.id,
              order.courier_consignment_id,
            )
          : await refreshPathaoOrderStatus(
            order.courier_credential_id,
            order.id,
            order.courier_consignment_id,
          );
      if (!result.success || !result.orderStatus) {
        notify.error(result.error ?? t.admin.pathaoShipmentFailed);
        return;
      }
      onShipped(order.courier_consignment_id, result.orderStatus);
    } catch (err) {
      console.error("Courier status refresh failed:", err);
      notify.error(err instanceof Error ? err.message : t.admin.pathaoShipmentFailed);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancelShipment = async () => {
    if (!order.courier_consignment_id || !order.courier_credential_id) return;
    setCancelling(true);
    try {
      const result = await cancelPaperflyShipment(
        order.courier_credential_id,
        order.id,
        order.courier_consignment_id,
      );
      if (!result.success || !result.orderStatus) {
        notify.error(result.error ?? t.admin.paperflyCancelFailed);
        return;
      }
      notify.success(t.admin.paperflyCancelledOk);
      onShipped(order.courier_consignment_id, result.orderStatus);
      setCancelConfirmOpen(false);
    } catch (err) {
      console.error("Courier shipment cancellation failed:", err);
      notify.error(err instanceof Error ? err.message : t.admin.paperflyCancelFailed);
    } finally {
      setCancelling(false);
    }
  };

  // Paperfly only accepts a cancel before the parcel is out of their hands —
  // hidden once it's cancelled, delivered, returned or the order is closed.
  const courierStatusLower = (order.courier_order_status ?? "").toLowerCase();
  const canCancelShipment =
    PAPERFLY_CANCEL_ENABLED &&
    isPaperfly &&
    !!order.courier_consignment_id &&
    !!order.courier_credential_id &&
    can("courier.add") &&
    !isCourierStatusCancelled(order.courier_order_status) &&
    !courierStatusLower.includes("deliver") &&
    !courierStatusLower.includes("return") &&
    order.status !== "delivered" &&
    order.status !== "returned";

  let activeContent: React.ReactNode = null;

  if (isApiCourier) {
    if (order.courier_consignment_id) {
      const statusStyle = getCourierStatusStyle(order.courier_order_status);
      activeContent = (
        <div className={`rounded-lg border border-l-4 ${statusStyle.border} pl-3.5 pr-3 sm:pr-4 py-3`}>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">{courierLabel}</span>
            <span className="text-xs text-muted-foreground font-mono">
              {order.courier_consignment_id}
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusStyle.dot}`} />
              <span className={`text-sm font-semibold ${statusStyle.text}`}>
                {prettifyCourierStatus(order.courier_order_status)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={handleRefreshStatus}
              disabled={refreshing || !order.courier_credential_id}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            {canCancelShipment && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 ml-auto text-red-600 hover:text-red-700"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={cancelling}
              >
                {t.admin.paperflyCancelBtn}
              </Button>
            )}
            {isPathao && (
              <a
                href={buildPathaoTrackingUrl(order.courier_consignment_id, recipientPhone)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto"
              >
                <Button size="sm" variant="outline" className="h-7">
                  {t.admin.pathaoTrackOnPathao}
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </a>
            )}
          </div>
        </div>
      );
    } else if (!courierTrackingAllowed) {
      // Viewing an existing shipment (the branch above) still works even on
      // a downgraded plan — this only blocks starting a brand-new one.
      activeContent = (
        <div className="flex items-center gap-2 p-3 sm:p-4 rounded-md border border-amber-200 bg-amber-50/60">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800">
            {t.admin.courierFeatureLocked}
          </span>
        </div>
      );
    } else if (order.status !== "delivered") {
      // A delivered order never legitimately needs a brand-new shipment —
      // hide the "create one" affordance entirely rather than show it
      // disabled, since there's no condition that would ever re-enable it.
      // Cancelled orders keep it, since reshipping after a cancellation is
      // a real scenario.
      if (accounts !== null && accountsForCourier.length === 0) {
        activeContent = (
          <div className="flex items-center gap-2 p-3 sm:p-4 rounded-md border border-amber-200 bg-amber-50/60">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-800">
              {t.admin.courierNoAccountConnected.replace("{courier}", courierLabel)}
            </span>
          </div>
        );
      } else {
        activeContent = (
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-md border">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {courierLabel} — {t.admin.pathaoNotShipped}
              </span>
            </div>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              {courierLabel} — {t.admin.pathaoCreateShipmentBtn}
            </Button>
          </div>
        );
      }
    }
  }

  if (!activeContent && history.length === 0) return null;

  return (
    <div className="space-y-2">
      {activeContent}

      {history.length > 0 && (
        <div className="rounded-md border border-dashed p-3 sm:p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            {t.admin.courierPastShipmentsTitle}
          </div>
          {history.map((h) => (
            <div
              key={h.trackingId}
              className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
            >
              <span className="font-medium">{h.courier}</span>
              <span className="font-mono">{h.consignmentId}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-muted">
                {h.status || "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={t.admin.paperflyCancelConfirmTitle}
        open={cancelConfirmOpen}
        onCancel={() => !cancelling && setCancelConfirmOpen(false)}
        maskClosable={!cancelling}
        destroyOnHidden
        width={440}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelConfirmOpen(false)}
              disabled={cancelling}
            >
              {t.admin.paperflyCancelKeepBtn}
            </Button>
            <Button variant="destructive" onClick={handleCancelShipment} disabled={cancelling}>
              {cancelling ? t.admin.paperflyCancelling : t.admin.paperflyCancelBtn}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t.admin.paperflyCancelConfirmBody.replace(
            "{consignment}",
            order.courier_consignment_id ?? "",
          )}
        </p>
      </Modal>

      <Modal
        title={`${courierLabel} — ${t.admin.pathaoCreateShipmentBtn}`}
        open={modalOpen}
        onCancel={() => !submitting && setModalOpen(false)}
        maskClosable={!submitting}
        destroyOnHidden
        width={480}
        footer={
          <div className="flex justify-end">
            <Button
              onClick={handleCreateShipment}
              disabled={
                submitting ||
                !selectedAccountId ||
                !name.trim() ||
                !phone.trim() ||
                !address.trim()
              }
            >
              {submitting ? t.admin.pathaoCreatingShipment : t.admin.pathaoCreateShipmentBtn}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
            {accountsForCourier.length > 1 && (
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoShipFrom}</Label>
                <Select
                  className="w-full"
                  value={selectedAccountId || undefined}
                  onChange={setSelectedAccountId}
                  placeholder={t.admin.pathaoSelectAccount}
                  options={accountsForCourier.map((a) => ({ value: a.id, label: a.label }))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t.admin.pathaoRecipientName}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.admin.pathaoRecipientPhone}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.admin.pathaoRecipientAddress}</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {(isPathao || isPaperfly) && (
                <div className="space-y-1.5">
                  <Label>{t.admin.pathaoItemWeight}</Label>
                  <Input
                    type="number"
                    min={isPaperfly ? 0.1 : 0.5}
                    max={isPaperfly ? undefined : 10}
                    step={0.1}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoAmountToCollect}</Label>
                <Input
                  type="number"
                  min={0}
                  value={amountToCollect}
                  onChange={(e) => setAmountToCollect(Number(e.target.value))}
                />
              </div>
            </div>
            {isPathao && (
              <div className="grid grid-cols-2 gap-2.5 text-xs text-muted-foreground">
                <p>
                  {t.admin.pathaoItemQuantity}: <span className="font-medium text-foreground">{totalItemQuantity}</span>
                </p>
                <p>
                  {t.admin.pathaoDeliveryTypeLabel}:{" "}
                  <span className="font-medium text-foreground">{t.admin.pathaoParcelType}</span>
                </p>
              </div>
            )}
            {/* Paperfly's order API has no note/instruction field. */}
            {!isPaperfly && (
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoSpecialInstructionLabel}</Label>
                <Textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder={t.admin.pathaoSpecialInstructionPlaceholder}
                  rows={2}
                />
              </div>
            )}
        </div>
      </Modal>
    </div>
  );
}
