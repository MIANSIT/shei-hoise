"use client";

import { useState } from "react";
import { Button, Dropdown, Tooltip } from "antd";
import type { MenuProps } from "antd";
import { Copy, MessageCircle, Star } from "lucide-react";
import type { StoreOrder } from "@/lib/types/order";
import { createReviewInviteLink } from "@/lib/queries/reviews/createReviewInviteLink";
import { toWhatsAppNumber } from "@/lib/utils/phoneNumber";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";

interface ReviewLinkButtonProps {
  order: StoreOrder;
  /** Same chip style as the other row actions. */
  className?: string;
}

/**
 * Ask a customer for a review, right from the order row (delivered orders).
 * One menu per product: copy its review link, or open WhatsApp with the
 * customer's number and a ready message containing the link.
 */
export function ReviewLinkButton({ order, className }: ReviewLinkButtonProps) {
  const t = useTranslation();
  const notify = useSheiNotification();
  const [busy, setBusy] = useState(false);

  const phone = order.shipping_address?.phone || order.customers?.phone || "";
  const waNumber = phone && phone !== "N/A" ? toWhatsAppNumber(phone) : "";
  const customerName = order.shipping_address?.customer_name || order.customers?.first_name || "";

  // One entry per product (an order can list the same product twice).
  const products = Array.from(new Map((order.order_items ?? []).map((i) => [i.product_id, i])).values());

  const makeLink = async (productId: string): Promise<string | null> => {
    setBusy(true);
    try {
      const result = await createReviewInviteLink(order.id, productId);
      if (!result.success) {
        notify.error(result.error);
        return null;
      }
      return result.url;
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (productId: string) => {
    const url = await makeLink(productId);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      notify.success(t.admin.reviewLinkCopied);
    } catch {
      notify.info(url);
    }
  };

  const sendOnWhatsApp = async (productId: string, productName: string) => {
    // Open the tab first (inside the click) so the browser doesn't block it,
    // then point it at WhatsApp once the link is ready.
    const tab = window.open("", "_blank");
    const url = await makeLink(productId);
    if (!url) {
      tab?.close();
      return;
    }
    const message = t.admin.reviewWhatsAppMessage
      .replace("{name}", customerName ? ` ${customerName}` : "")
      .replace("{product}", productName)
      .replace("{link}", url);
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    if (tab) tab.location.href = waUrl;
    else window.location.href = waUrl;
  };

  if (products.length === 0) return null;

  const items: MenuProps["items"] = products.flatMap((item, index) => {
    const name = item.product_name;
    const group: NonNullable<MenuProps["items"]> = [
      ...(products.length > 1
        ? [{ type: "group" as const, key: `g-${item.product_id}`, label: name }]
        : []),
      {
        key: `copy-${item.product_id}`,
        icon: <Copy size={14} />,
        label: products.length > 1 ? t.admin.reviewCopyLink : `${t.admin.reviewCopyLink} — ${name}`,
        onClick: () => copyLink(item.product_id),
      },
      {
        key: `wa-${item.product_id}`,
        icon: <MessageCircle size={14} />,
        label: t.admin.reviewSendWhatsApp,
        disabled: !waNumber,
        onClick: () => sendOnWhatsApp(item.product_id, name),
      },
    ];
    return index < products.length - 1 ? [...group, { type: "divider" as const, key: `d-${index}` }] : group;
  });

  return (
    <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
      <Tooltip title={t.admin.reviewAskTooltip}>
        <Button
          type="text"
          icon={<Star size={15} />}
          loading={busy}
          onClick={(e) => e.stopPropagation()}
          aria-label={t.admin.reviewAskTooltip}
          className={className}
        />
      </Tooltip>
    </Dropdown>
  );
}
