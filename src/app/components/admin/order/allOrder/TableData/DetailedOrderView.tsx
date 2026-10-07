"use client";

import React, { useState } from "react";
import { App } from "antd";
import { StoreOrder } from "@/lib/types/order";
import { Check, Copy, FileText, MapPin, Package, Phone, User } from "lucide-react";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { createReviewInviteLink } from "@/lib/queries/reviews/createReviewInviteLink";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import OrderDeliveryCostSection from "./OrderDeliveryCostSection";

/** Orders with more lines than this show the rest behind a "show all" button. */
const VISIBLE_ITEMS = 6;

interface Props {
  order: StoreOrder;
  /** Advance / partial payment already recorded against this order. */
  paidAmount?: number;
}

type OrderAddress = NonNullable<StoreOrder["shipping_address"]>;

/** A titled white card used for every block of the details panel. */
const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, aside, children }) => (
  <section className="rounded-2xl border border-border bg-card p-4">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h3>
      {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
    </div>
    {children}
  </section>
);

const DetailedOrderView: React.FC<Props> = ({ order, paidAmount = 0 }) => {
  const { message } = App.useApp();
  const t = useTranslation();
  const n = useLocalNum();
  const [showAllItems, setShowAllItems] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [generatingReviewLink, setGeneratingReviewLink] = useState<string | null>(null);
  const { icon: currencyIcon, loading: currencyLoading } = useUserCurrencyIcon();

  const icon = (!currencyLoading && currencyIcon) || "৳";
  const money = (amount: number) => `${icon}${n(amount.toFixed(2))}`;

  const shipping = order.shipping_address;
  const billing = order.billing_address;
  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const isClosed = isCancelled || order.status === "returned";

  const addressText = (a: OrderAddress | null | undefined) =>
    [a?.address_line_1, a?.city, a?.country].filter(Boolean).join(", ");

  const copyToClipboard = (text: string, label: string, fieldId: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        message.success(`${label} ${t.admin.odCopied}`);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
      })
      .catch(() => message.error(t.admin.orderCopyFailed));
  };

  const handleGetReviewLink = async (itemId: string, productId: string) => {
    setGeneratingReviewLink(itemId);
    try {
      const result = await createReviewInviteLink(order.id, productId);
      if (!result.success) {
        message.error(result.error);
        return;
      }
      copyToClipboard(result.url, t.admin.odReviewLink, `review-${itemId}`);
    } catch (err) {
      console.error(err);
      message.error(t.admin.odReviewLinkFailed);
    } finally {
      setGeneratingReviewLink(null);
    }
  };

  const CopyButton = ({ text, label, fieldId }: { text: string; label: string; fieldId: string }) => (
    <button
      type="button"
      aria-label={`${t.admin.odCopy} ${label}`}
      title={`${t.admin.odCopy} ${label}`}
      onClick={() => copyToClipboard(text, label, fieldId)}
      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copiedField === fieldId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );

  const AddressBlock = ({ address, prefix }: { address: OrderAddress; prefix: string }) => (
    <div className="space-y-1.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
          <User size={13} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{address.customer_name}</span>
        </span>
        <CopyButton text={address.customer_name} label={t.admin.orderColCustomer} fieldId={`${prefix}-name`} />
      </div>
      {address.phone && (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Phone size={13} className="shrink-0" />
            {n(address.phone)}
          </span>
          <CopyButton text={address.phone} label={t.admin.odPhone} fieldId={`${prefix}-phone`} />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-start gap-2 text-muted-foreground">
          <MapPin size={13} className="mt-0.5 shrink-0" />
          <span className="wrap-break-word">{addressText(address) || t.admin.odNoAddress}</span>
        </span>
        {addressText(address) && (
          <CopyButton text={addressText(address)} label={t.admin.orderColAddress} fieldId={`${prefix}-address`} />
        )}
      </div>
    </div>
  );

  const totalSavings = order.order_items.reduce((sum, item) => {
    const basePrice = item.variant_details?.base_price ?? item.unit_price;
    const finalPrice = item.variant_details?.discounted_price ?? item.discounted_price ?? basePrice;
    return finalPrice < basePrice ? sum + (basePrice - finalPrice) * item.quantity : sum;
  }, 0);

  const showBilling = !!billing && addressText(billing) !== addressText(shipping);
  const due = Math.max(order.total_amount - paidAmount, 0);
  const showDue = !isClosed && order.payment_status !== "paid" && due > 0;

  const summaryRow = (label: string, value: string, tone?: string) => (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${tone ?? "text-foreground"}`}>{value}</span>
    </div>
  );

  return (
    <div className="grid w-full gap-4 lg:grid-cols-3">
      {/* Left: what was ordered */}
      <div className="space-y-4 lg:col-span-2">
        <Section
          title={t.admin.odItems}
          icon={<Package size={15} />}
          aside={t.admin.odItemsCount.replace("{n}", n(order.order_items.length))}
        >
          <ul className="m-0 list-none divide-y divide-border p-0">
            {(showAllItems ? order.order_items : order.order_items.slice(0, VISIBLE_ITEMS)).map((item) => {
              const variant = item.variant_details;
              const basePrice = variant?.base_price ?? item.unit_price;
              const finalPrice = variant?.discounted_price ?? item.discounted_price ?? basePrice;
              const hasDiscount = finalPrice < basePrice;
              const sku = item.variant_sku || item.product_sku || "";
              return (
                <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="wrap-break-word text-sm font-medium text-foreground">{item.product_name}</div>
                    {(variant || sku) && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {[variant?.variant_name, sku && `${t.admin.odSku}: ${sku}`].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      {hasDiscount && <span className="text-muted-foreground line-through">{money(basePrice)}</span>}
                      <span className={`font-semibold ${hasDiscount ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                        {money(finalPrice)}
                      </span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-semibold text-foreground">
                        × {n(item.quantity)}
                      </span>
                      {isDelivered && (
                        <button
                          type="button"
                          onClick={() => handleGetReviewLink(item.id, item.product_id)}
                          disabled={generatingReviewLink === item.id}
                          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 dark:text-blue-400"
                        >
                          {copiedField === `review-${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                          {generatingReviewLink === item.id ? t.admin.odGenerating : t.admin.odReviewLink}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {money(finalPrice * item.quantity)}
                  </div>
                </li>
              );
            })}
          </ul>
          {order.order_items.length > VISIBLE_ITEMS && (
            <button
              type="button"
              onClick={() => setShowAllItems((open) => !open)}
              className="mt-3 w-full rounded-lg border border-border py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-muted dark:text-blue-400"
            >
              {showAllItems
                ? t.admin.odShowFewer
                : t.admin.odShowAllItems.replace("{n}", n(order.order_items.length))}
            </button>
          )}
        </Section>

        <div className={`grid gap-4 ${showBilling ? "md:grid-cols-2" : ""}`}>
        {shipping && (
          <Section title={t.admin.odShipTo} icon={<MapPin size={15} />}>
            <AddressBlock address={shipping} prefix="ship" />
          </Section>
        )}

        {showBilling && billing && (
          <Section title={t.admin.odBilling} icon={<User size={15} />}>
            <AddressBlock address={billing} prefix="bill" />
          </Section>
        )}
        </div>

        {order.notes && (
          <section
            className={`rounded-2xl border p-4 ${
              isCancelled
                ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
                : "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
            }`}
          >
            <h3
              className={`m-0 mb-1 flex items-center gap-2 text-sm font-semibold ${
                isCancelled ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200"
              }`}
            >
              <FileText size={15} />
              {isCancelled ? t.admin.odCancelNote : t.admin.odNotes}
            </h3>
            <p className="m-0 whitespace-pre-wrap text-sm text-foreground/80">{order.notes}</p>
          </section>
        )}
      </div>

      {/* Right: money and who it goes to */}
      {/* Stays in view while a long item list scrolls past. */}
      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Section title={t.admin.odOrderSummary} icon={<FileText size={15} />}>
          {summaryRow(t.admin.odSubtotal, money(order.subtotal))}
          {(order.discount_amount ?? 0) > 0 &&
            summaryRow(t.admin.odDiscount, `-${money(order.discount_amount ?? 0)}`, "text-emerald-600 dark:text-emerald-400")}
          {summaryRow(t.admin.odShippingFee, money(order.shipping_fee || 0))}
          {/* Actual courier cost vs. what the customer was charged above */}
          <OrderDeliveryCostSection orderId={order.id} shippingFee={order.shipping_fee || 0} currencyIcon={icon} />
          {(order.tax_amount ?? 0) > 0 && summaryRow(t.admin.odTax, money(order.tax_amount ?? 0))}
          {(order.additional_charges ?? 0) > 0 &&
            summaryRow(t.admin.odAdditional, money(order.additional_charges ?? 0))}
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2.5 text-base font-bold text-foreground">
            <span>{t.admin.odTotal}</span>
            <span className="tabular-nums">{money(order.total_amount)}</span>
          </div>
          {paidAmount > 0 && summaryRow(t.admin.odPaid, money(paidAmount), "text-emerald-600 dark:text-emerald-400")}
          {showDue && summaryRow(t.admin.ordersDue, money(due), "text-rose-600 dark:text-rose-400")}
          {totalSavings > 0 && (
            <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              {t.admin.odTotalSavings}: {money(totalSavings)}
            </div>
          )}
        </Section>

      </div>
    </div>
  );
};

export default DetailedOrderView;
