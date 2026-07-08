"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getDeliveryCouriers } from "@/lib/queries/deliveryCouriers/getDeliveryCouriers";
import {
  getOrderShipmentHistory,
  type OrderShipmentHistoryEntry,
} from "@/lib/queries/courier/getOrderShipmentHistory";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { getCourierStatusStyle, prettifyCourierStatus } from "@/lib/utils/courierStatusDisplay";
import type { StoreOrder } from "@/lib/types/order";

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

  const [accounts, setAccounts] = useState<CourierAccountStatus[] | null>(null);
  const [courierName, setCourierName] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<OrderShipmentHistoryEntry[]>([]);

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

  useEffect(() => {
    getOrderShipmentHistory(order.id).then(setHistory);
  }, [order.id, order.courier_consignment_id]);

  useEffect(() => {
    if (!isPathao && !isSteadfast) return;
    getConnectedCourierAccounts(order.store_id).then((all) => {
      setAccounts(all);
      const connected = all.filter((a) => a.courier === order.courier && a.connected);
      if (connected.length === 1) setSelectedAccountId(connected[0].id);
    });
    getDeliveryCouriers(order.store_id).then((all) => {
      setCourierName(all.find((c) => c.type === order.courier)?.name ?? "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.store_id, order.courier]);

  const courierLabel = courierName || (isSteadfast ? t.admin.steadfastCardTitle : t.admin.pathaoCardTitle);

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
            itemDescription: order.order_items?.map((i) => i.product_name).join(", "),
            specialInstruction: instruction.trim() || undefined,
            amountToCollect: Number(amountToCollect),
          })
        : await createSteadfastShipment(selectedAccountId, order.id, order.order_number, {
            recipientName: name.trim(),
            recipientPhone: phone.trim(),
            recipientAddress: address.trim(),
            codAmount: Number(amountToCollect),
            note: instruction.trim() || undefined,
            itemDescription: order.order_items?.map((i) => i.product_name).join(", "),
          });

      if (!result.success || !result.consignmentId || !result.orderStatus) {
        notify.error(result.error ?? t.admin.pathaoShipmentFailed);
        return;
      }

      notify.success(t.admin.pathaoShipmentCreatedOk);
      onShipped(result.consignmentId, result.orderStatus);
      setModalOpen(false);
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
    } finally {
      setRefreshing(false);
    }
  };

  let activeContent: React.ReactNode = null;

  if (isPathao || isSteadfast) {
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
              <span className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                {h.status || "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {courierLabel} — {t.admin.pathaoCreateShipmentBtn}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {accountsForCourier.length > 1 && (
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoShipFrom}</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.admin.pathaoSelectAccount} />
                  </SelectTrigger>
                  <SelectContent>
                    {accountsForCourier.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              {isPathao && (
                <div className="space-y-1.5">
                  <Label>{t.admin.pathaoItemWeight}</Label>
                  <Input
                    type="number"
                    min={0.5}
                    max={10}
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
            <div className="space-y-1.5">
              <Label>{t.admin.pathaoSpecialInstructionLabel}</Label>
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={t.admin.pathaoSpecialInstructionPlaceholder}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
