"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Truck, ExternalLink, RefreshCw } from "lucide-react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import {
  getPathaoConnectedAccounts,
  type PathaoAccountStatus,
} from "@/lib/queries/pathao/getPathaoConnectedAccounts";
import { createPathaoShipment } from "@/lib/queries/pathao/createPathaoShipment";
import { refreshPathaoOrderStatus } from "@/lib/queries/pathao/getPathaoOrderStatus";
import type { StoreOrder } from "@/lib/types/order";

interface PathaoShipmentPanelProps {
  order: StoreOrder;
  onShipped: (consignmentId: string, orderStatus: string) => void;
}

function buildTrackingUrl(consignmentId: string, phone: string): string {
  return `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(
    consignmentId,
  )}&phone=${encodeURIComponent(phone)}`;
}

export default function PathaoShipmentPanel({
  order,
  onShipped,
}: PathaoShipmentPanelProps) {
  const notify = useSheiNotification();
  const t = useTranslation();

  const [accounts, setAccounts] = useState<PathaoAccountStatus[] | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const recipientName =
    order.shipping_address?.customer_name || order.customers?.first_name || "";
  const recipientPhone =
    order.shipping_address?.phone || order.customers?.phone || "";
  const recipientAddress =
    (order.shipping_address?.address_line_1 || order.shipping_address?.address || "") +
    (order.shipping_address?.city ? `, ${order.shipping_address.city}` : "");

  const [name, setName] = useState(recipientName);
  const [phone, setPhone] = useState(recipientPhone);
  const [address, setAddress] = useState(recipientAddress);
  const [weight, setWeight] = useState("0.5");
  const [amountToCollect, setAmountToCollect] = useState(
    order.payment_status === "paid" ? 0 : order.total_amount,
  );

  useEffect(() => {
    getPathaoConnectedAccounts(order.store_id).then((all) => {
      const connectedOnly = all.filter((a) => a.connected);
      setAccounts(connectedOnly);
      if (connectedOnly.length === 1) setSelectedAccountId(connectedOnly[0].id);
    });
  }, [order.store_id]);

  if (accounts === null || accounts.length === 0) return null;

  const handleCreateShipment = async () => {
    if (!selectedAccountId) return;
    setSubmitting(true);
    try {
      const result = await createPathaoShipment(
        selectedAccountId,
        order.id,
        order.order_number,
        {
          recipientName: name.trim(),
          recipientPhone: phone.trim(),
          recipientAddress: address.trim(),
          itemWeight: Number(weight),
          itemQuantity: order.order_items?.length || 1,
          itemDescription: order.order_items?.map((i) => i.product_name).join(", "),
          amountToCollect: Number(amountToCollect),
        },
      );

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
    if (!order.pathao_consignment_id || !order.pathao_credential_id) return;
    setRefreshing(true);
    try {
      const result = await refreshPathaoOrderStatus(
        order.pathao_credential_id,
        order.id,
        order.pathao_consignment_id,
      );
      if (!result.success || !result.orderStatus) {
        notify.error(result.error ?? t.admin.pathaoShipmentFailed);
        return;
      }
      onShipped(order.pathao_consignment_id, result.orderStatus);
    } finally {
      setRefreshing(false);
    }
  };

  if (order.pathao_consignment_id) {
    return (
      <div className="flex flex-wrap items-center gap-2.5 p-3 sm:p-4 rounded-md border">
        <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium">{t.admin.pathaoShipmentStatus}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          {order.pathao_order_status ?? "—"}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefreshStatus}
          disabled={refreshing || !order.pathao_credential_id}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        <a
          href={buildTrackingUrl(order.pathao_consignment_id, recipientPhone)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto"
        >
          <Button size="sm" variant="outline">
            {t.admin.pathaoTrackOnPathao}
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 sm:p-4 rounded-md border">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t.admin.pathaoNotShipped}
          </span>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          {t.admin.pathaoCreateShipmentBtn}
        </Button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.admin.pathaoCreateShipmentBtn}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {accounts.length > 1 && (
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoShipFrom}</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.admin.pathaoSelectAccount} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label} — {a.pathaoStoreName}
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
    </>
  );
}
