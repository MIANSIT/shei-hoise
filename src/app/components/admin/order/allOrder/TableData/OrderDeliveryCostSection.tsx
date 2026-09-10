"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button, InputNumber, Input, Popover } from "antd";
import { HistoryOutlined, LoadingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { addOrderDeliveryCost } from "@/lib/queries/orders/deliveryCost/addOrderDeliveryCost";
import {
  getOrderDeliveryCosts,
  type OrderDeliveryCost,
} from "@/lib/queries/orders/deliveryCost/getOrderDeliveryCosts";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface Props {
  orderId: string;
  shippingFee: number;
  /** ReactNode, not string — some currencies render as an icon component (see useUserCurrencyIcon), so this is always used as JSX children, never string-concatenated. */
  currencyIcon: ReactNode;
}

/**
 * Records what the courier actually charged for this order — separate from
 * shipping_fee (what the customer was charged) above it. The gap between
 * the two is real money the store gains or loses on delivery, which used to
 * be invisible (the P&L dashboard assumed they were always equal); this
 * feeds it into gross_profit via order_delivery_costs' migration.
 *
 * History, not a single edit: a courier cost is often revised (a failed
 * delivery attempt, a final invoice arriving later), so every entry is kept
 * — the most recent one is what counts for profit.
 */
export default function OrderDeliveryCostSection({ orderId, shippingFee, currencyIcon }: Props) {
  const notify = useSheiNotification();
  const [history, setHistory] = useState<OrderDeliveryCost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    const data = await getOrderDeliveryCosts(orderId);
    setHistory(data);
    setLoaded(true);
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const latest = history[0] ?? null;
  const delta = latest ? shippingFee - latest.amount : null;

  const handleHistoryOpenChange = async (next: boolean) => {
    setHistoryOpen(next);
    if (next && !loaded) {
      setHistoryLoading(true);
      try {
        await loadHistory();
      } finally {
        setHistoryLoading(false);
      }
    }
  };

  const handleRecord = async () => {
    if (amount == null || amount < 0) {
      notify.error("Enter the delivery cost the courier charged");
      return;
    }
    setSaving(true);
    try {
      const result = await addOrderDeliveryCost(orderId, amount, note.trim() || null);
      if (!result.success) {
        notify.error(result.error || "Failed to record delivery cost");
        return;
      }
      notify.success("Delivery cost recorded");
      setAmount(null);
      setNote("");
      await loadHistory();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          Actual Delivery Cost
          <Popover
            open={historyOpen}
            onOpenChange={handleHistoryOpenChange}
            trigger="click"
            placement="bottomLeft"
            content={
              <div style={{ width: 220 }}>
                <p className="m-0 mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Revision history
                </p>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-4 text-gray-400">
                    <LoadingOutlined />
                  </div>
                ) : history.length === 0 ? (
                  <p className="m-0 py-2 text-[11.5px] text-muted-foreground">
                    Nothing recorded yet.
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {history.map((h, i) => (
                      <div
                        key={h.id}
                        className={`flex items-center justify-between gap-2 py-1.5 text-[11.5px] ${
                          i > 0 ? "border-t border-border" : ""
                        }`}
                      >
                        <span className="text-muted-foreground truncate">
                          {h.createdByName ?? "—"} · {dayjs(h.createdAt).format("MMM D, h:mm A")}
                          {h.note ? ` · ${h.note}` : ""}
                        </span>
                        <span className="shrink-0 font-bold">
                          {currencyIcon}
                          {h.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            }
          >
            <button
              type="button"
              aria-label="Delivery cost history"
              className="flex h-5 w-5 items-center justify-center rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 dark:text-gray-500 transition-colors"
            >
              <HistoryOutlined style={{ fontSize: 11 }} />
            </button>
          </Popover>
        </span>
        <span className="flex items-center gap-2">
          {latest ? (
            <span className="font-semibold text-sm text-foreground">
              {currencyIcon}
              {latest.amount.toFixed(2)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground italic">Not recorded</span>
          )}
          {delta != null && Math.abs(delta) > 0.01 && (
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                delta >= 0
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {currencyIcon}
              {delta.toFixed(2)} {delta >= 0 ? "gain" : "loss"}
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <InputNumber
          min={0}
          placeholder="Courier charged…"
          value={amount}
          onChange={(v) => setAmount(v == null ? null : Number(v))}
          style={{ width: 120 }}
          size="small"
        />
        <Input
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          size="small"
          style={{ flex: 1 }}
        />
        <Button size="small" type="primary" loading={saving} onClick={handleRecord}>
          Record
        </Button>
      </div>
    </div>
  );
}
