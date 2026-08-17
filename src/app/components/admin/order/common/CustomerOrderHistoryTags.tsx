"use client";

import { memo } from "react";
import { Tooltip } from "antd";
import dayjs from "dayjs";
import {
  HISTORY_LIMIT,
  type CustomerHistoryEntry,
} from "@/lib/types/orders/customerHistory";

interface CustomerOrderHistoryTagsProps {
  /** This customer's recent orders, newest first, as returned by the API. */
  history?: CustomerHistoryEntry[];
  /** The order currently being viewed — excluded so only *prior* orders show. */
  currentOrderId?: string;
  /** Renders nothing at all when there is no prior history (default), or a hint. */
  showEmptyHint?: boolean;
}

// Delivered vs cancelled is the signal a shop owner is actually reading here —
// a customer with three cancellations is a COD risk. So those two get strong
// colours and the in-flight states stay muted.
const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> =
  {
    delivered: { bg: "bg-emerald-100", text: "text-emerald-700", label: "D" },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "C" },
    shipped: { bg: "bg-blue-50", text: "text-blue-600", label: "S" },
    confirmed: { bg: "bg-amber-50", text: "text-amber-600", label: "P" },
    pending: { bg: "bg-gray-100", text: "text-gray-500", label: "N" },
  };

const FALLBACK = { bg: "bg-gray-100", text: "text-gray-500", label: "?" };

function CustomerOrderHistoryTags({
  history,
  currentOrderId,
  showEmptyHint = false,
}: CustomerOrderHistoryTagsProps) {
  const prior = (history ?? [])
    .filter((h) => h.orderId !== currentOrderId)
    .slice(0, HISTORY_LIMIT);

  if (prior.length === 0) {
    return showEmptyHint ? (
      <span className="text-[11px] text-gray-400">First order</span>
    ) : null;
  }

  const delivered = prior.filter((h) => h.status === "delivered").length;
  const cancelled = prior.filter((h) => h.status === "cancelled").length;

  return (
    <Tooltip
      title={
        <div className="text-[12px] leading-relaxed">
          <div className="font-semibold mb-1">
            Last {prior.length} order{prior.length !== 1 ? "s" : ""} ·{" "}
            {delivered} delivered · {cancelled} cancelled
          </div>
          {prior.map((h) => (
            <div key={h.orderId} className="whitespace-nowrap">
              {dayjs(h.createdAt).format("DD MMM YY")} · {h.orderNumber} ·{" "}
              <span className="capitalize">{h.status}</span>
            </div>
          ))}
        </div>
      }
    >
      <span className="inline-flex items-center gap-0.5 align-middle">
        {prior.map((h) => {
          const s = STATUS_STYLE[h.status] ?? FALLBACK;
          return (
            <span
              key={h.orderId}
              className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold ${s.bg} ${s.text}`}
            >
              {s.label}
            </span>
          );
        })}
      </span>
    </Tooltip>
  );
}

export default memo(CustomerOrderHistoryTags);
