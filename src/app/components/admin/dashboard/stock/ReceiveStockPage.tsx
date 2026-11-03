"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dayjs, { Dayjs } from "dayjs";
import { Button, DatePicker, Empty, Input, InputNumber, Select, Spin } from "antd";
import { Trash2, Truck } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useBranches } from "@/lib/context/BranchContext";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { getSuppliers } from "@/lib/queries/supplier/suppliers";
import type { Supplier } from "@/lib/queries/supplier/supplierTypes";
import { getProductWithStock } from "@/lib/queries/products/getProductWithStock";
import { receivePurchase } from "@/lib/queries/supplier/purchases";
import type { ReceivePurchaseInput } from "@/lib/queries/supplier/purchaseTypes";
import { StockFilter } from "@/lib/types/enums";
import { useReceiveDraftStore } from "@/lib/store/receiveDraftStore";

const PAY_METHODS = ["cash", "mobile_banking", "bank_transfer"] as const;
type PayMethod = (typeof PAY_METHODS)[number];

/** One product (or one variant of it) that can be added to a delivery. */
interface ProductOption {
  key: string;
  productId: string;
  variantId: string | null;
  label: string;
  /** Units in stock before this delivery. */
  stock: number;
  /** Cost per unit now; null when it was never set. */
  cost: number | null;
}

interface Line extends ProductOption {
  quantity: number | null;
  unitCost: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A typed unit cost more than double or less than half of the product's current cost is probably a typo (an extra or missing zero). */
const COST_OFF_RATIO = 2;
const costLooksOff = (l: Pick<Line, "cost" | "unitCost">): boolean =>
  (l.cost ?? 0) > 0 && (l.unitCost ?? 0) > 0 && ((l.unitCost ?? 0) > (l.cost ?? 0) * COST_OFF_RATIO || (l.unitCost ?? 0) < (l.cost ?? 0) / COST_OFF_RATIO);

/**
 * Receive stock from a supplier. One save adds the stock, moves each product's
 * cost to the weighted average, adds the supplier bill and, when something was
 * paid now, the payment. The bill amount comes from the lines, so nothing is
 * typed twice.
 */
export default function ReceiveStockPage() {
  const t = useTranslation();
  const n = useLocalNum();
  const { storeId, storeSlug, loading: userLoading } = useCurrentUser();
  const { can } = usePermissions();
  const { enabled: branchesOn, activeBranches, workBranchId } = useBranches();
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const symbol = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const money = (amount: number) => `${symbol}${n(round2(amount).toLocaleString())}`;
  const { success, error: showError } = useSheiNotification();
  const allowed = can("stock.edit") && can("stock.supplier_money");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [billNo, setBillNo] = useState("");
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [dueDate, setDueDate] = useState<Dayjs | null>(null);
  // The pay-by date follows the supplier's terms until the person types a date of their own.
  const [dueTouched, setDueTouched] = useState(false);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [paid, setPaid] = useState<number | null>(null);
  const [method, setMethod] = useState<PayMethod>("cash");
  const [saving, setSaving] = useState(false);

  const [options, setOptions] = useState<ProductOption[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  const termsDays = suppliers.find((s) => s.id === supplierId)?.paymentTermsDays ?? null;
  useEffect(() => {
    if (dueTouched) return;
    setDueDate(termsDays ? date.add(termsDays, "day") : null);
  }, [termsDays, date, dueTouched]);

  // An order handed over from the Reorder List: filled in once, then forgotten.
  const draft = useReceiveDraftStore((s) => s.draft);
  const clearDraft = useReceiveDraftStore((s) => s.clearDraft);
  useEffect(() => {
    if (!draft || suppliers.length === 0) return;
    if (suppliers.some((s) => s.id === draft.supplierId)) setSupplierId(draft.supplierId);
    setLines(
      draft.lines.map((l) => ({
        key: l.variantId ? `${l.productId}:${l.variantId}` : l.productId,
        productId: l.productId,
        variantId: l.variantId,
        label: l.label,
        stock: l.stock,
        cost: l.unitCost > 0 ? l.unitCost : null,
        quantity: l.quantity,
        unitCost: l.unitCost > 0 ? l.unitCost : null,
      })),
    );
    clearDraft();
  }, [draft, suppliers, clearDraft]);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    getSuppliers(storeId)
      .then((list) => {
        if (!cancelled) setSuppliers(list.filter((s) => s.isActive));
      })
      .catch((err) => console.error("Failed to load suppliers:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  // Stores with branches: the branch the person is working in is the default.
  useEffect(() => {
    if (branchesOn && !branchId && workBranchId) setBranchId(workBranchId);
  }, [branchesOn, branchId, workBranchId]);

  const search = useCallback(
    async (text: string) => {
      if (!storeSlug) return;
      const seq = ++searchSeq.current;
      setSearching(true);
      try {
        const result = await getProductWithStock(storeSlug, text, StockFilter.ALL, 1, 20, null, null);
        if (seq !== searchSeq.current) return;
        const next: ProductOption[] = [];
        for (const p of result.data) {
          if (p.variants.length > 0) {
            for (const v of p.variants) {
              next.push({
                key: `${p.id}:${v.id}`,
                productId: p.id,
                variantId: v.id,
                label: `${p.name} · ${v.variant_name}`,
                stock: Number(v.stock?.quantity_available ?? 0),
                cost: v.tp_price ?? p.tp_price ?? null,
              });
            }
          } else {
            next.push({
              key: p.id,
              productId: p.id,
              variantId: null,
              label: p.name,
              stock: Number(p.stock?.quantity_available ?? 0),
              cost: p.tp_price ?? null,
            });
          }
        }
        setOptions(next);
      } catch (err) {
        console.error("Product search failed:", err);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    },
    [storeSlug],
  );

  useEffect(() => {
    if (storeSlug) void search("");
  }, [storeSlug, search]);

  const addLine = (key: string) => {
    const option = options.find((o) => o.key === key);
    if (!option) return;
    setLines((prev) =>
      prev.some((l) => l.key === key) ? prev : [...prev, { ...option, quantity: 1, unitCost: option.cost }],
    );
  };

  const patchLine = (key: string, patch: Partial<Pick<Line, "quantity" | "unitCost">>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const total = useMemo(
    () => round2(lines.reduce((sum, l) => sum + round2((l.quantity ?? 0) * (l.unitCost ?? 0)), 0)),
    [lines],
  );
  const paidNow = Math.min(paid ?? 0, total);
  const left = round2(total - paidNow);

  const supplierName = suppliers.find((s) => s.id === supplierId)?.name ?? "";

  const methodLabel: Record<PayMethod, string> = {
    cash: t.admin.moCash,
    mobile_banking: t.admin.moMobileBanking,
    bank_transfer: t.admin.moBankTransfer,
  };

  /** Weighted-average cost after this delivery, as the database will work it out. */
  const averageAfter = (l: Line): number | null => {
    const qty = l.quantity ?? 0;
    const cost = l.unitCost;
    if (cost === null || qty <= 0) return null;
    if (l.stock > 0 && (l.cost ?? 0) > 0) return round2((l.stock * (l.cost ?? 0) + qty * cost) / (l.stock + qty));
    return round2(cost);
  };

  const submit = async () => {
    if (!storeId) return;
    if (!supplierId) return showError(t.admin.rcNeedSupplier);
    if (lines.length === 0) return showError(t.admin.rcNeedLines);
    if (lines.some((l) => !l.quantity || l.quantity <= 0 || l.unitCost === null)) return showError(t.admin.rcNoCostWarn);
    if (branchesOn && !branchId) return showError(t.admin.rcNeedBranch);
    if ((paid ?? 0) > total) return showError(t.admin.rcPaidTooMuch);

    const input: ReceivePurchaseInput = {
      supplierId,
      branchId: branchesOn ? branchId : null,
      billNo: billNo.trim() || undefined,
      purchaseDate: date.format("YYYY-MM-DD"),
      dueDate: dueDate ? dueDate.format("YYYY-MM-DD") : null,
      note: note.trim() || undefined,
      items: lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity ?? 0,
        unitCost: l.unitCost ?? 0,
      })),
      paidAmount: paidNow,
      paymentMethod: method,
      paidFrom: "shop",
    };

    setSaving(true);
    try {
      const result = await receivePurchase(storeId, input);
      if (!result.success) {
        showError(result.error);
        return;
      }
      success(t.admin.rcSaved.replace("{amount}", money(result.billAmount)).replace("{supplier}", supplierName));
      setLines([]);
      setBillNo("");
      setNote("");
      setPaid(null);
      setDueDate(null);
      setDueTouched(false);
      void search("");
    } catch (err) {
      showError(err instanceof Error ? err.message : t.admin.rcSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  if (!allowed) {
    return <div className="p-6 text-sm text-muted-foreground">{t.admin.rcNoAccess}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
          <Truck size={20} aria-hidden="true" />
          {t.admin.rcTitle}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">{t.admin.rcSub}</p>
      </div>

      {suppliers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <Empty description={t.admin.rcNoSuppliers}>
            <Link href="/dashboard/stock/suppliers">
              <Button type="primary">{t.admin.rcViewSuppliers}</Button>
            </Link>
          </Empty>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label htmlFor="rc-supplier" className="block text-xs font-semibold text-muted-foreground">
                {t.admin.rcSupplier}
              </label>
              <Select
                id="rc-supplier"
                className="w-full mt-1"
                placeholder={t.admin.rcSupplierPh}
                value={supplierId}
                onChange={setSupplierId}
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                showSearch={{ optionFilterProp: "label" }}
              />
            </div>
            <div>
              <label htmlFor="rc-bill" className="block text-xs font-semibold text-muted-foreground">
                {t.admin.rcBillNo}
              </label>
              <Input id="rc-bill" className="mt-1" value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder={t.admin.rcBillNoPh} maxLength={60} />
            </div>
            <div>
              <label htmlFor="rc-date" className="block text-xs font-semibold text-muted-foreground">
                {t.admin.rcDate}
              </label>
              <DatePicker
                id="rc-date"
                format="DD-MM-YYYY"
                value={date}
                onChange={(d) => d && setDate(d)}
                allowClear={false}
                disabledDate={(d) => d.isAfter(dayjs(), "day")}
                className="w-full mt-1"
              />
            </div>
            <div>
              <label htmlFor="rc-due" className="block text-xs font-semibold text-muted-foreground">
                {t.admin.rcDue}
              </label>
              <DatePicker
                id="rc-due"
                format="DD-MM-YYYY"
                value={dueDate}
                onChange={(d) => {
                  setDueDate(d);
                  setDueTouched(true);
                }}
                disabledDate={(d) => d.isBefore(date, "day")}
                className="w-full mt-1"
              />
              {termsDays != null && !dueTouched && (
                <p className="m-0 mt-1 text-[11px] text-muted-foreground">{t.admin.rcDueFromTerms.replace("{n}", n(String(termsDays)))}</p>
              )}
            </div>
            {branchesOn && (
              <div>
                <label htmlFor="rc-branch" className="block text-xs font-semibold text-muted-foreground">
                  {t.admin.rcBranch}
                </label>
                <Select
                  id="rc-branch"
                  className="w-full mt-1"
                  placeholder={t.admin.rcBranchPh}
                  value={branchId}
                  onChange={setBranchId}
                  options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
                />
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="rc-note" className="block text-xs font-semibold text-muted-foreground">
                {t.admin.rcNote}
              </label>
              <Input id="rc-note" className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div>
              <label htmlFor="rc-add" className="block text-xs font-semibold text-muted-foreground">
                {t.admin.rcAddProduct}
              </label>
              <Select
                id="rc-add"
                className="w-full mt-1"
                placeholder={t.admin.rcSearchPh}
                value={null}
                showSearch={{ filterOption: false, onSearch: (text: string) => void search(text) }}
                loading={searching}
                onChange={(key: string | null) => key && addLine(key)}
                options={options.map((o) => ({ value: o.key, label: o.label }))}
              />
            </div>

            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t.admin.rcNoLines}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-170">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3 font-semibold">{t.admin.rcColProduct}</th>
                      <th className="py-2 pr-3 font-semibold w-28">{t.admin.rcColQty}</th>
                      <th className="py-2 pr-3 font-semibold w-32">{t.admin.rcColCost}</th>
                      <th className="py-2 pr-3 font-semibold">{t.admin.rcColAvg}</th>
                      <th className="py-2 pr-3 font-semibold text-right">{t.admin.rcColTotal}</th>
                      <th className="py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => {
                      const avg = averageAfter(l);
                      return (
                        <tr key={l.key} className="border-b border-border last:border-b-0 align-top">
                          <td className="py-2 pr-3 text-foreground">
                            {l.label}
                            <span className="block text-xs text-muted-foreground">
                              {t.admin.rcInStock.replace("{units}", n(l.stock))}
                            </span>
                          </td>
                          <td className="py-2 pr-3">
                            <InputNumber
                              min={1}
                              precision={0}
                              value={l.quantity}
                              onChange={(v) => patchLine(l.key, { quantity: v === null ? null : Number(v) })}
                              style={{ width: "100%" }}
                              aria-label={t.admin.rcColQty}
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <InputNumber
                              min={0}
                              precision={2}
                              value={l.unitCost}
                              onChange={(v) => patchLine(l.key, { unitCost: v === null ? null : Number(v) })}
                              style={{ width: "100%" }}
                              aria-label={t.admin.rcColCost}
                              status={costLooksOff(l) ? "warning" : undefined}
                            />
                            {costLooksOff(l) && (
                              <p role="alert" className="m-0 mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                {t.admin.rcCostOff.replace("{current}", money(l.cost ?? 0)).replace("{typed}", money(l.unitCost ?? 0))}
                              </p>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {avg === null
                              ? "—"
                              : t.admin.rcAvgHint
                                  .replace("{before}", l.cost ? money(l.cost) : "—")
                                  .replace("{after}", money(avg))}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-foreground whitespace-nowrap">
                            {money((l.quantity ?? 0) * (l.unitCost ?? 0))}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                              className="text-muted-foreground hover:text-rose-600"
                              aria-label={t.admin.rcRemoveLine}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-foreground">{t.admin.rcPaidNow}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rc-paid" className="block text-xs font-semibold text-muted-foreground">
                    {t.admin.rcPaidNowAmount}
                  </label>
                  <InputNumber id="rc-paid" min={0} max={total} precision={2} value={paid} onChange={(v) => setPaid(v === null ? null : Number(v))} style={{ width: "100%" }} className="mt-1" />
                </div>
                <div>
                  <label htmlFor="rc-method" className="block text-xs font-semibold text-muted-foreground">
                    {t.admin.rcPaidMethod}
                  </label>
                  <Select
                    id="rc-method"
                    className="w-full mt-1"
                    value={method}
                    onChange={(v: PayMethod) => setMethod(v)}
                    options={PAY_METHODS.map((m) => ({ value: m, label: methodLabel[m] }))}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-foreground">{t.admin.rcSummary}</h2>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t.admin.rcBillTotal}</dt>
                  <dd className="font-semibold tabular-nums">{money(total)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t.admin.rcPaidNow}</dt>
                  <dd className="tabular-nums">{money(paidNow)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-border pt-1">
                  <dt className="font-semibold">{t.admin.rcLeft}</dt>
                  <dd className="font-bold tabular-nums">{money(left)}</dd>
                </div>
              </dl>
              <Button type="primary" size="large" block loading={saving} onClick={submit} disabled={lines.length === 0}>
                {t.admin.rcSave}
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
