"use client";

import { useEffect, useState } from "react";
import { App, Button, Dropdown, Tooltip } from "antd";
import type { MenuProps } from "antd";
import { Copy, MessageCircle } from "lucide-react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import { getStoreById } from "@/lib/queries/stores/getStoreById";
import { buildDueReminderMessage, type DueReminderLanguage } from "@/lib/utils/dueReminderMessage";
import { toWhatsAppNumber } from "@/lib/utils/phoneNumber";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { recordDueReminder } from "@/lib/queries/customers/dueReminders";
import { formatTime } from "@/lib/utils/formatDate";
interface DueReminderButtonProps {
  storeId: string;
  customerId: string;
  branchId: string | null;
  /** When this row was last reminded (ISO), if ever. */
  lastRemindedAt?: string | null;
  /** Called with the new reminder time after one is sent or copied. */
  onReminded: (remindedAt: string) => void;
  customerName: string | null;
  phone: string | null;
  amount: number;
  currency: string;
  dueSince: string;
}

/**
 * "Remind" on a Customer Dues row: opens WhatsApp with a polite, ready-to-send
 * payment reminder (Bangla or English), or copies the same text.
 */
export function DueReminderButton({
  storeId,
  customerId,
  branchId,
  lastRemindedAt,
  onReminded,
  customerName,
  phone,
  amount,
  currency,
  dueSince,
}: DueReminderButtonProps) {
  const t = useTranslation();
  const notify = useSheiNotification();
  const { user } = useCurrentUser();
  const { modal } = App.useApp();
  const [store, setStore] = useState<{ name: string; phone: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStoreById(storeId)
      .then((row) => {
        if (!cancelled && row?.store_name) setStore({ name: row.store_name, phone: row.contact_phone ?? null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const waNumber = phone && phone !== "N/A" ? toWhatsAppNumber(phone) : "";
  const disabledReason = !waNumber ? t.admin.dueRemindNoPhone : !store ? t.admin.dueRemindLoading : "";

  const message = (language: DueReminderLanguage) =>
    buildDueReminderMessage({
      language,
      customerName,
      storeName: store?.name ?? "",
      currency,
      amount,
      dueSince,
      // The store's own number; the owner's if the store has none saved.
      contactPhone: store?.phone || user?.phone || null,
    });

  const log = async (channel: "whatsapp" | "copy") => {
    const result = await recordDueReminder({ storeId, customerId, branchId, amount, channel });
    if (result.success) onReminded(result.remindedAt);
    else notify.error(result.error);
  };

  const remindedToday = !!lastRemindedAt && new Date(lastRemindedAt).toDateString() === new Date().toDateString();

  // Reminding the same customer twice in a day is allowed, but asked about first.
  const confirmIfRepeat = (action: () => void) => {
    if (!remindedToday || !lastRemindedAt) {
      action();
      return;
    }
    modal.confirm({
      title: t.admin.dueAlreadyRemindedTitle,
      content: t.admin.dueAlreadyRemindedBody
        .replace("{name}", customerName || "")
        .replace("{time}", formatTime(lastRemindedAt)),
      okText: t.admin.dueSendAgain,
      cancelText: t.admin.orderDeleteCancel,
      onOk: action,
    });
  };

  const send = (language: DueReminderLanguage) =>
    confirmIfRepeat(() => {
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message(language))}`, "_blank");
      void log("whatsapp");
    });

  const copy = (language: DueReminderLanguage) =>
    confirmIfRepeat(async () => {
      try {
        await navigator.clipboard.writeText(message(language));
        notify.success(t.admin.dueRemindCopied);
        void log("copy");
      } catch {
        notify.error(t.admin.orderCopyFailed);
      }
    });

  const items: MenuProps["items"] = [
    { key: "wa-bn", icon: <MessageCircle size={14} />, label: t.admin.dueRemindSendBn, disabled: !waNumber, onClick: () => send("bn") },
    { key: "wa-en", icon: <MessageCircle size={14} />, label: t.admin.dueRemindSendEn, disabled: !waNumber, onClick: () => send("en") },
    { type: "divider", key: "d" },
    { key: "copy-bn", icon: <Copy size={14} />, label: t.admin.dueRemindCopyBn, onClick: () => copy("bn") },
    { key: "copy-en", icon: <Copy size={14} />, label: t.admin.dueRemindCopyEn, onClick: () => copy("en") },
  ];

  return (
    <Tooltip title={disabledReason || t.admin.dueRemindTooltip}>
      <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight" disabled={!store}>
        <Button size="small" icon={<MessageCircle size={14} />}>
          {t.admin.dueRemind}
        </Button>
      </Dropdown>
    </Tooltip>
  );
}
