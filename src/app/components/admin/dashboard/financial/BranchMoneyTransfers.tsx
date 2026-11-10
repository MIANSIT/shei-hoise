"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { Button, DatePicker, Input, InputNumber, Popconfirm, Select } from "antd";
import { ArrowRight } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useBranches } from "@/lib/context/BranchContext";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { cancelBranchTransfer, confirmBranchTransfer, listBranchTransfers, sendBranchTransfer } from "@/lib/queries/financial/branchMoneyTransfers";
import { TRANSFER_METHODS, type BranchTransfer, type TransferMethod } from "@/lib/queries/financial/branchMoneyTransferTypes";

const BOX = { width: "100%" } as const;

interface BranchMoneyTransfersProps {
  /** Called after money was sent, confirmed or cancelled, so the balances above reload. */
  onChanged: () => void;
}

/**
 * Money between branches. One branch sends, and the money is "in transit" until the other branch confirms it:
 * it leaves the sender's balance when sent and reaches the receiver's balance only when confirmed, so each branch
 * can check what it really received.
 */
export function BranchMoneyTransfers({ onChanged }: BranchMoneyTransfersProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const { storeId } = useCurrentUser();
  const { branches, activeBranches, workBranchId } = useBranches();
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const symbol = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const money = (amount: number) => `${symbol}${n((Math.round(amount * 100) / 100).toLocaleString())}`;
  const { success, error: showError } = useSheiNotification();

  const [rows, setRows] = useState<BranchTransfer[]>([]);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<TransferMethod>("cash");
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const nameOf = useMemo(() => {
    const names = new Map(branches.map((b) => [b.id, b.name]));
    return (id: string) => names.get(id) ?? "—";
  }, [branches]);
  const methodLabel: Record<TransferMethod, string> = {
    cash: t.admin.moCash,
    mobile_banking: t.admin.moMobileBanking,
    bank_transfer: t.admin.moBankTransfer,
  };

  const load = useCallback(async () => {
    if (!storeId) return;
    setRows(await listBranchTransfers(storeId));
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!from) setFrom(workBranchId ?? activeBranches[0]?.id);
  }, [from, workBranchId, activeBranches]);

  const changed = async () => {
    await load();
    onChanged();
  };

  const send = async () => {
    if (!storeId) return;
    if (!from || !to) return showError(t.admin.btNeedBranches);
    if (amount === null || amount <= 0) return showError(t.admin.invNeedAmount);
    setSaving(true);
    try {
      const result = await sendBranchTransfer(storeId, { fromBranchId: from, toBranchId: to, amount, method, date: date.format("YYYY-MM-DD"), note: note || undefined });
      if (!result.success) return showError(result.error ?? t.admin.invFailed);
      success(t.admin.btSentOk);
      setAmount(null);
      setNote("");
      await changed();
    } finally {
      setSaving(false);
    }
  };

  const act = async (id: string, run: (storeId: string, id: string) => Promise<{ success: boolean; error?: string }>, message: string) => {
    if (!storeId) return;
    setBusyId(id);
    try {
      const result = await run(storeId, id);
      if (!result.success) return showError(result.error ?? t.admin.invFailed);
      success(message);
      await changed();
    } finally {
      setBusyId(null);
    }
  };

  const activeIds = new Set(activeBranches.map((b) => b.id));
  const waiting = rows.filter((r) => r.status === "sent" && activeIds.has(r.toBranchId));
  const sentOut = rows.filter((r) => r.status === "sent" && activeIds.has(r.fromBranchId) && !waiting.includes(r));
  const history = rows.filter((r) => r.status !== "sent").slice(0, 8);

  const label = "block text-xs font-semibold text-muted-foreground mb-1";
  const line = (r: BranchTransfer) => (
    <span className="min-w-0">
      <span className="font-semibold text-foreground">{nameOf(r.fromBranchId)}</span>
      <ArrowRight size={13} className="mx-1.5 inline text-muted-foreground" aria-hidden="true" />
      <span className="font-semibold text-foreground">{nameOf(r.toBranchId)}</span>
      <span className="ml-2 tabular-nums">{money(r.amount)}</span>
      <span className="ml-2 text-xs text-muted-foreground">
        {methodLabel[r.method]} · {n(dayjs(r.date).format("DD-MM-YYYY"))}
        {r.note ? ` · ${r.note}` : ""}
      </span>
    </span>
  );

  return (
    <section id="branch-transfers" className="scroll-mt-20 rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
      <h2 className="m-0 text-sm font-bold text-foreground">{t.admin.btTitle}</h2>
      <p className="m-0 mb-4 mt-0.5 text-xs text-muted-foreground">{t.admin.btSub}</p>

      {waiting.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">{t.admin.btWaiting}</p>
          <ul className="m-0 list-none space-y-2 p-0">
            {waiting.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                {line(r)}
                <Button type="primary" size="small" loading={busyId === r.id} onClick={() => act(r.id, confirmBranchTransfer, t.admin.btConfirmedOk)}>
                  {t.admin.btConfirm}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sentOut.length > 0 && (
        <div className="mb-4 rounded-xl border border-border p-3">
          <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.admin.btSentWaiting}</p>
          <ul className="m-0 list-none space-y-2 p-0">
            {sentOut.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                {line(r)}
                <Popconfirm title={t.admin.btCancelConfirm} okText={t.admin.btCancel} onConfirm={() => act(r.id, cancelBranchTransfer, t.admin.btCancelledOk)}>
                  <Button size="small" loading={busyId === r.id}>
                    {t.admin.btCancel}
                  </Button>
                </Popconfirm>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="bt-from" className={label}>
            {t.admin.btFrom}
          </label>
          <Select id="bt-from" style={BOX} placeholder={t.admin.moChooseBranch} value={from} onChange={setFrom} options={activeBranches.map((b) => ({ value: b.id, label: b.name }))} />
        </div>
        <div>
          <label htmlFor="bt-to" className={label}>
            {t.admin.btTo}
          </label>
          <Select
            id="bt-to"
            style={BOX}
            placeholder={t.admin.moChooseBranch}
            value={to}
            onChange={setTo}
            options={branches.filter((b) => b.id !== from).map((b) => ({ value: b.id, label: b.name }))}
          />
        </div>
        <div>
          <label htmlFor="bt-amount" className={label}>
            {t.admin.invAmount}
          </label>
          <InputNumber id="bt-amount" min={0} precision={2} value={amount} onChange={(v) => setAmount(v === null ? null : Number(v))} style={BOX} />
        </div>
        <div>
          <label htmlFor="bt-method" className={label}>
            {t.admin.slMethod}
          </label>
          <Select id="bt-method" style={BOX} value={method} onChange={setMethod} options={TRANSFER_METHODS.map((m) => ({ value: m, label: methodLabel[m] }))} />
        </div>
        <div>
          <label htmlFor="bt-date" className={label}>
            {t.admin.mbkDate}
          </label>
          <DatePicker id="bt-date" format="DD-MM-YYYY" value={date} onChange={(d) => d && setDate(d)} allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} style={BOX} />
        </div>
        <div>
          <label htmlFor="bt-note" className={label}>
            {t.admin.mbkNote}
          </label>
          <Input id="bt-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </div>
      </div>
      <div className="mt-3">
        <Button type="primary" loading={saving} onClick={send}>
          {t.admin.btSend}
        </Button>
      </div>
      <p className="m-0 mt-2 text-[11px] text-muted-foreground">{t.admin.btHow}</p>

      {history.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer select-none text-sm font-semibold text-foreground">{t.admin.btHistory}</summary>
          <ul className="m-0 mt-2 list-none divide-y divide-border p-0">
            {history.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                {line(r)}
                <span className={`text-xs font-semibold ${r.status === "received" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                  {r.status === "received" ? `${t.admin.btConfirmedLabel} ${n(dayjs(r.receivedDate ?? r.date).format("DD-MM-YYYY"))}` : t.admin.btCancelledLabel}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
