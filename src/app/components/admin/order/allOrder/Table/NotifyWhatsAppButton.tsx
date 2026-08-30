"use client";

import React, { useEffect, useState } from "react";
import { Button, Tooltip } from "antd";
import { MessageCircle, Check, Copy } from "lucide-react";
import { StoreOrder } from "@/lib/types/order";
import { getStoreById } from "@/lib/queries/stores/getStoreById";
import {
  buildOrderStatusMessage,
  buildOrderStatusWhatsAppLink,
} from "@/lib/notifications/notifyOrderStatus";
import { markOrderWhatsAppNotified } from "@/lib/queries/orders/markOrderWhatsAppNotified";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

interface Props {
  order: StoreOrder;
}

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// No SMS provider is wired up yet — this opens WhatsApp with the status
// message pre-filled so the store owner can review and tap send themselves.
// A real SMS provider can replace this later behind the same order+status
// message builder (see src/lib/notifications/notifyOrderStatus.ts).
const NotifyWhatsAppButton: React.FC<Props> = ({ order }) => {
  const { success: notifySuccess } = useSheiNotification();
  const { user } = useCurrentUser();
  const [storeName, setStoreName] = useState<string | null>(null);
  const [businessPhone, setBusinessPhone] = useState<string | null>(null);
  const [notifiedAt, setNotifiedAt] = useState<string | null>(
    order.whatsapp_notified_at ?? null,
  );
  // Read only after mount so server-rendered and first-client-render HTML
  // match — navigator isn't available on the server to decide this upfront.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStoreById(order.store_id).then((store) => {
      if (!cancelled) {
        setStoreName(store?.store_name ?? null);
        setBusinessPhone(store?.contact_phone ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [order.store_id]);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  const phone = order.shipping_address?.phone || order.customers?.phone || "";
  const customerName =
    order.shipping_address?.customer_name || order.customers?.first_name || "there";

  // Prefer the store's registered business number over the owner's personal
  // one — this is only ever a hint for which WhatsApp account to be signed
  // into, since a wa.me link has no way to choose the sender itself.
  const senderNumber = businessPhone || user?.phone || null;
  const senderIsPersonal = !businessPhone && !!user?.phone;

  const handleClick = () => {
    if (!storeName) return;
    const link = buildOrderStatusWhatsAppLink(
      { storeName, orderNumber: order.order_number, customerName, phone, status: order.status },
      isMobile,
    );
    if (!link) return;

    // A custom whatsapp:// scheme needs a full navigation to hand off to the
    // app — window.open treats it as a blocked popup on several mobile
    // browsers. https:// still opens in a new tab so the admin dashboard
    // stays open underneath.
    if (isMobile) {
      window.location.href = link;
    } else {
      window.open(link, "_blank", "noopener,noreferrer");
    }

    notifySuccess("WhatsApp opened — tap Send in the chat", { duration: 4000 });

    // Best-effort: this only records that the link was opened, not that the
    // message was actually sent — WhatsApp itself doesn't tell us that.
    const optimisticNotifiedAt = new Date().toISOString();
    setNotifiedAt(optimisticNotifiedAt);
    markOrderWhatsAppNotified(order.id).catch((err) =>
      console.error("[notify] failed to record WhatsApp notification", err),
    );
  };

  // For an owner who doesn't use WhatsApp at all — no wa.me link can help
  // them, so this copies the same message to paste into a plain SMS, a
  // phone call script, or any other channel they do have.
  const handleCopy = () => {
    if (!storeName) return;
    const message = buildOrderStatusMessage({
      storeName,
      orderNumber: order.order_number,
      customerName,
      phone,
      status: order.status,
    });
    if (!message) return;
    navigator.clipboard.writeText(`${message}\n\nSend to: ${phone}`).then(() => {
      notifySuccess("Message copied — paste it anywhere", { duration: 3000 });
    });
  };

  const link = storeName
    ? buildOrderStatusWhatsAppLink(
        { storeName, orderNumber: order.order_number, customerName, phone, status: order.status },
        false,
      )
    : null;

  if (!link) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Tooltip title="Opens WhatsApp with the status update pre-filled — you review and send it">
          <Button
            icon={<MessageCircle size={14} />}
            onClick={handleClick}
            className="text-green-600! border-green-600!"
          >
            Notify via WhatsApp
          </Button>
        </Tooltip>
        <Tooltip title="Copy the message to send another way — useful if you don't use WhatsApp">
          <Button icon={<Copy size={14} />} onClick={handleCopy}>
            Copy message
          </Button>
        </Tooltip>
        {notifiedAt && (
          <Tooltip title={new Date(notifiedAt).toLocaleString()}>
            <span className="inline-flex items-center gap-1 text-xs text-green-700">
              <Check size={12} />
              Notified {formatRelativeTime(notifiedAt)}
            </span>
          </Tooltip>
        )}
      </div>
      {senderNumber && (
        <span className="text-xs text-muted-foreground">
          Before {isMobile ? "tapping" : "clicking"} Notify, make sure{" "}
          {isMobile ? "WhatsApp on this phone" : "WhatsApp Web"} is signed in as{" "}
          your {senderIsPersonal ? "" : "business "}number: {senderNumber}
        </span>
      )}
    </div>
  );
};

export default NotifyWhatsAppButton;
