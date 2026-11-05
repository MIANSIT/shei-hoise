"use client";

import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { Button, InputNumber, Spin } from "antd";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { setOrderItemCost } from "@/lib/queries/orders/setOrderItemCost";

interface LineRow {
  id: string;
  product_name: string | null;
  variant_details: { variant_name?: string | null } | null;
  quantity: number;
  unit_price: number;
  cost_price: number | null;
  order: { order_number: string; order_date: string; status: string } | null;
  product: { name: string; tp_price: number | null; product_type: string | null } | null;
  variant: { variant_name: string | null; tp_price: number | null } | null;
}

/**
 * Sold order lines that have no cost anywhere (no cost saved on the line, and no TP on the variant or product),
 * the same lines the profit warning counts. Each shows why, and the cost can be typed to fix that line's profit.
 */
export function OrderLinesWithoutCost() {
  const t = useTranslation();
  const { storeId } = useCurrentUser();
  const { success, error: showError } = useSheiNotification();
  const [lines, setLines] = useState<LineRow[] | null>(null);
  const [costs, setCosts] = useState<Record<string, number | null>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("order_items")
      .select(
        "id, product_name, variant_details, quantity, unit_price, cost_price, order:orders!inner(order_number, order_date, status, store_id), product:products(name, tp_price, product_type), variant:product_variants(variant_name, tp_price)",
      )
      .eq("order.store_id", storeId)
      .not("order.status", "in", "(cancelled,returned)")
      .or("cost_price.is.null,cost_price.eq.0")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      setLines([]);
      return;
    }
    const rows = (data ?? []) as unknown as LineRow[];
    // Same rule as the profit warning: no cost on the line, and no TP on the variant or the product.
    setLines(rows.filter((r) => !(Number(r.variant?.tp_price) > 0) && !(Number(r.product?.tp_price) > 0)).slice(0, 100));
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (id: string) => {
    const cost = costs[id];
    if (!cost || cost <= 0) return showError(t.admin.npNeedCost);
    setBusy(id);
    try {
      const result = await setOrderItemCost(id, cost);
      if (!result.ok) return showError(result.error);
      success(t.admin.npCostSaved);
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (lines === null) {
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    );
  }
  if (lines.length === 0) return null;

  const reason = (r: LineRow): string => {
    if (!r.product) return t.admin.npReasonDeleted;
    if (r.product.product_type === "bundle") return t.admin.npReasonBundle;
    return t.admin.npReasonSold;
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-bold text-foreground">{t.admin.npLinesTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.admin.npLinesSub}</p>
      </div>
      <ul className="m-0 list-none divide-y divide-border rounded-2xl border border-border bg-card p-0">
        {lines.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="m-0 font-medium text-foreground">
                {r.product?.name ?? r.product_name ?? "—"}
                {r.variant?.variant_name || r.variant_details?.variant_name ? (
                  <span className="font-normal text-muted-foreground"> · {r.variant?.variant_name ?? r.variant_details?.variant_name}</span>
                ) : null}
              </p>
              <p className="m-0 text-xs text-muted-foreground">
                {t.admin.npLineMeta
                  .replace("{order}", r.order?.order_number ?? "")
                  .replace("{date}", r.order ? dayjs(r.order.order_date).format("DD-MM-YYYY") : "")
                  .replace("{qty}", String(r.quantity))
                  .replace("{amount}", String(Math.round(r.unit_price * r.quantity * 100) / 100))}{" "}
                · {reason(r)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <InputNumber
                min={0}
                precision={2}
                placeholder={t.admin.npCostPh}
                value={costs[r.id] ?? null}
                onChange={(v) => setCosts((prev) => ({ ...prev, [r.id]: v === null ? null : Number(v) }))}
                style={{ width: 120 }}
                aria-label={t.admin.npCostPh}
              />
              <Button size="small" loading={busy === r.id} onClick={() => save(r.id)}>
                {t.admin.npSetCost}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
