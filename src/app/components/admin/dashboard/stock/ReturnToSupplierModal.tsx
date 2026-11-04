"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker, Input, InputNumber, Modal, Select } from "antd";
import { Trash2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useBranches } from "@/lib/context/BranchContext";
import { getSuppliers } from "@/lib/queries/supplier/suppliers";
import type { Supplier } from "@/lib/queries/supplier/supplierTypes";
import { getProductWithStock } from "@/lib/queries/products/getProductWithStock";
import { returnToSupplier } from "@/lib/queries/supplier/supplierReturns";
import { StockFilter } from "@/lib/types/enums";

interface ReturnOption {
  key: string;
  productId: string;
  variantId: string | null;
  label: string;
  /** Units in stock; a return cannot be more than this. */
  stock: number;
  /** Cost per unit now: the default credit. */
  cost: number | null;
}

interface ReturnLine extends ReturnOption {
  quantity: number | null;
  unitCredit: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

interface ReturnToSupplierModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a return is saved, so the bills can be reloaded. */
  onSaved: () => void;
  money: (amount: number) => string;
}

/**
 * Return goods to a supplier: pick the supplier and the products, say how many and what the
 * supplier credits per unit. The stock goes down and the supplier's account is credited, so what
 * the shop owes them falls. No money moves.
 */
export function ReturnToSupplierModal({ open, onClose, onSaved, money }: ReturnToSupplierModalProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const { storeId, storeSlug } = useCurrentUser();
  const { enabled: branchesOn, activeBranches, workBranchId } = useBranches();
  const { success, error: showError } = useSheiNotification();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<ReturnLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<ReturnOption[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (!open || !storeId) return;
    getSuppliers(storeId).then((list) => setSuppliers(list.filter((s) => s.isActive)));
  }, [open, storeId]);
  useEffect(() => {
    if (open && branchesOn && !branchId && workBranchId) setBranchId(workBranchId);
  }, [open, branchesOn, branchId, workBranchId]);

  const search = useCallback(
    async (text: string) => {
      if (!storeSlug) return;
      const seq = ++searchSeq.current;
      setSearching(true);
      try {
        const result = await getProductWithStock(storeSlug, text, StockFilter.ALL, 1, 20, null, null);
        if (seq !== searchSeq.current) return;
        const next: ReturnOption[] = [];
        for (const p of result.data) {
          if (p.variants.length > 0) {
            for (const v of p.variants) {
              next.push({ key: `${p.id}:${v.id}`, productId: p.id, variantId: v.id, label: `${p.name} · ${v.variant_name}`, stock: Number(v.stock?.quantity_available ?? 0), cost: v.tp_price ?? p.tp_price ?? null });
            }
          } else {
            next.push({ key: p.id, productId: p.id, variantId: null, label: p.name, stock: Number(p.stock?.quantity_available ?? 0), cost: p.tp_price ?? null });
          }
        }
        setOptions(next);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    },
    [storeSlug],
  );
  useEffect(() => {
    if (open && storeSlug) void search("");
  }, [open, storeSlug, search]);

  const patchLine = (key: string, patch: Partial<Pick<ReturnLine, "quantity" | "unitCredit">>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const credit = round2(lines.reduce((sum, l) => sum + round2((l.quantity ?? 0) * (l.unitCredit ?? 0)), 0));

  const reset = () => {
    setLines([]);
    setNote("");
    setSupplierId(null);
    setDate(dayjs());
  };

  const submit = async () => {
    if (!storeId) return;
    if (!supplierId) return showError(t.admin.rtNeedSupplier);
    if (lines.length === 0) return showError(t.admin.rtNeedLines);
    if (lines.some((l) => !l.quantity || l.quantity <= 0 || l.quantity > l.stock)) return showError(t.admin.rtQtyProblem);
    if (branchesOn && !branchId) return showError(t.admin.rcNeedBranch);
    setSaving(true);
    try {
      const result = await returnToSupplier(storeId, {
        supplierId,
        branchId: branchesOn ? branchId : null,
        date: date.format("YYYY-MM-DD"),
        note: note.trim() || undefined,
        items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity ?? 0, unitCredit: l.unitCredit ?? 0 })),
      });
      if (!result.success) return showError(result.error);
      success(t.admin.rtSaved.replace("{amount}", money(result.credit)));
      reset();
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={submit}
      title={t.admin.rtTitle}
      okText={t.admin.rtConfirm}
      cancelText={t.admin.mcCancel}
      okButtonProps={{ loading: saving, disabled: lines.length === 0 || !supplierId }}
      width={720}
      destroyOnHidden
    >
      <p className="m-0 mb-3 text-xs text-muted-foreground">{t.admin.rtHint}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-muted-foreground">{t.admin.rcSupplier}</label>
          <Select
            className="mt-1 w-full"
            placeholder={t.admin.rcSupplierPh}
            value={supplierId}
            onChange={setSupplierId}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">{t.admin.rtDate}</label>
          <DatePicker className="mt-1 w-full" format="DD-MM-YYYY" value={date} onChange={(d) => d && setDate(d)} allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} />
        </div>
        {branchesOn && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.rcBranch}</label>
            <Select className="mt-1 w-full" placeholder={t.admin.rcBranchPh} value={branchId} onChange={setBranchId} options={activeBranches.map((b) => ({ value: b.id, label: b.name }))} />
          </div>
        )}
        <div className={branchesOn ? "" : "sm:col-span-2"}>
          <label className="text-xs font-semibold text-muted-foreground">{t.admin.rcNote}</label>
          <Input className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold text-muted-foreground">{t.admin.rcAddProduct}</label>
        <Select
          className="mt-1 w-full"
          placeholder={t.admin.rcSearchPh}
          value={null}
          showSearch={{ filterOption: false, onSearch: (text: string) => void search(text) }}
          loading={searching}
          onChange={(key: string | null) => {
            const option = options.find((o) => o.key === key);
            if (!option) return;
            setLines((prev) => (prev.some((l) => l.key === option.key) ? prev : [...prev, { ...option, quantity: 1, unitCredit: option.cost }]));
          }}
          options={options.map((o) => ({ value: o.key, label: `${o.label} (${t.admin.rcInStock.replace("{units}", n(o.stock))})` }))}
        />
      </div>

      {lines.length > 0 && (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-1 pr-2 font-semibold">{t.admin.rcColProduct}</th>
              <th className="py-1 pr-2 font-semibold w-24">{t.admin.rcColQty}</th>
              <th className="py-1 pr-2 font-semibold w-28">{t.admin.rtColCredit}</th>
              <th className="py-1 pr-2 text-right font-semibold">{t.admin.rcColTotal}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key} className="border-t border-border align-top">
                <td className="py-2 pr-2 text-foreground">
                  {l.label}
                  <span className="block text-xs text-muted-foreground">{t.admin.rcInStock.replace("{units}", n(l.stock))}</span>
                </td>
                <td className="py-2 pr-2">
                  <InputNumber min={1} max={l.stock} precision={0} value={l.quantity} onChange={(v) => patchLine(l.key, { quantity: v === null ? null : Number(v) })} style={{ width: "100%" }} />
                </td>
                <td className="py-2 pr-2">
                  {/* The credit is the product's TP. It can only be typed for a product that has no TP yet. */}
                  <InputNumber
                    min={0}
                    precision={2}
                    value={l.unitCredit}
                    disabled={l.cost != null && l.cost > 0}
                    onChange={(v) => patchLine(l.key, { unitCredit: v === null ? null : Number(v) })}
                    style={{ width: "100%" }}
                  />
                </td>
                <td className="py-2 pr-2 text-right tabular-nums whitespace-nowrap">{money(round2((l.quantity ?? 0) * (l.unitCredit ?? 0)))}</td>
                <td className="py-2 text-right">
                  <button type="button" onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))} className="text-muted-foreground hover:text-rose-600" aria-label={t.admin.rcRemoveLine}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <caption className="caption-bottom pt-2 text-left text-[11px] text-muted-foreground">{t.admin.rtTpLocked}</caption>
          <tfoot>
            <tr className="border-t-2 border-border font-bold">
              <td colSpan={3} className="py-2 pr-2">
                {t.admin.rtCreditTotal}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums">{money(credit)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}
    </Modal>
  );
}
