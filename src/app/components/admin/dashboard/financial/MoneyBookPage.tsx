"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { Button, DatePicker, Empty, Input, InputNumber, Popconfirm, Select, Spin } from "antd";
import { BookOpen, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useBranches } from "@/lib/context/BranchContext";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { addMoneyEntry, deleteMoneyEntry, recordCashCount, saveOpeningBalances } from "@/lib/queries/financial/moneyBook";
import { getCashPosition, getMoneyEntries, getOpeningBalances, getPartnerSummaries } from "@/lib/queries/financial/getCashPosition";
import { listMoneyPartners } from "@/lib/queries/financial/moneyPartners";
import type { MoneyPartner, PartnerSummary } from "@/lib/queries/financial/moneyPartnerTypes";
import {
  type CashPosition,
  type MoneyEntry,
  type MoneyEntryType,
  type MoneyInType,
  type MoneyMethod,
  type MoneyOutType,
  type OpeningLine,
} from "@/lib/queries/financial/moneyBookTypes";

const ENTRY_TYPES: readonly (MoneyInType | MoneyOutType)[] = [
  "owner_investment",
  "loan_received",
  "other_income",
  "loan_repayment",
  "equipment_purchase",
];
const IN_TYPES: ReadonlySet<string> = new Set<MoneyInType>(["owner_investment", "loan_received", "other_income"]);
/** Types that can have an owner or investor behind them. */
const PARTNER_TYPES: ReadonlySet<string> = new Set<MoneyInType | MoneyOutType>(["owner_investment", "loan_received", "loan_repayment"]);

/** The three boxes most owners need; the rest sit under "More options". */
const MAIN_LINES: readonly OpeningLine[] = ["cash", "mobile_banking", "bank_transfer"];
const MORE_LINES: readonly OpeningLine[] = ["fixed_assets", "loans"];
/** Online and Other are not offered, but any balance already saved on them is kept when saving. */
const ALL_LINES: readonly OpeningLine[] = [...MAIN_LINES, ...MORE_LINES, "card", "online", "other"];
const METHOD_CHOICES: readonly MoneyMethod[] = ["cash", "mobile_banking", "bank_transfer"];

const BOX = { width: "100%" } as const;

/**
 * The Money Book, kept short: tell it what you hold today (once), tell it
 * about the few things the system cannot see (owner money, loans, equipment),
 * and optionally check the drawer. Everything else is added automatically.
 * Owner only.
 */
export default function MoneyBookPage() {
  const t = useTranslation();
  const n = useLocalNum();
  const { storeId, loading: userLoading } = useCurrentUser();
  const { isOwner } = usePermissions();
  const { enabled: branchesOn, activeBranches, workBranchId } = useBranches();
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const symbol = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const money = (amount: number) => `${amount < 0 ? "−" : ""}${symbol}${n(Math.abs(Math.round(amount * 100) / 100).toLocaleString())}`;
  const { success, error: showError } = useSheiNotification();

  const [branchId, setBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<CashPosition | null>(null);
  const [entries, setEntries] = useState<MoneyEntry[]>([]);
  const [partners, setPartners] = useState<MoneyPartner[]>([]);
  const [summaries, setSummaries] = useState<PartnerSummary[]>([]);
  const [entryPartner, setEntryPartner] = useState<string | null>(null);

  const [asOf, setAsOf] = useState<Dayjs>(dayjs());
  const [amounts, setAmounts] = useState<Partial<Record<OpeningLine, number | null>>>({});
  const [savingOpening, setSavingOpening] = useState(false);

  const [entryType, setEntryType] = useState<MoneyInType | MoneyOutType>("owner_investment");
  const [entryInterest, setEntryInterest] = useState<number | null>(null);
  const [entryAmount, setEntryAmount] = useState<number | null>(null);
  const [entryMethod, setEntryMethod] = useState<MoneyMethod>("cash");
  const [entryDate, setEntryDate] = useState<Dayjs>(dayjs());
  const [entryNote, setEntryNote] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);

  const [counted, setCounted] = useState<number | null>(null);
  const [savingCount, setSavingCount] = useState(false);

  useEffect(() => {
    if (branchesOn && !branchId && workBranchId) setBranchId(workBranchId);
  }, [branchesOn, branchId, workBranchId]);

  const scopeBranch = branchesOn ? branchId : null;

  const load = useCallback(async () => {
    if (!storeId || !isOwner) return;
    setLoading(true);
    try {
      const [openings, cash, list, people, totals] = await Promise.all([
        getOpeningBalances(storeId),
        getCashPosition(storeId, scopeBranch, branchesOn),
        getMoneyEntries(storeId),
        listMoneyPartners(storeId),
        getPartnerSummaries(storeId),
      ]);
      setPartners(people);
      setSummaries(totals);
      const mine = openings.filter((o) => o.branchId === scopeBranch);
      const next: Partial<Record<OpeningLine, number | null>> = {};
      for (const row of mine) next[row.line] = row.amount;
      // Card is part of Bank now: a balance saved earlier on card is shown (and saved) under Bank.
      if ((next.card ?? 0) > 0) {
        next.bank_transfer = (next.bank_transfer ?? 0) + (next.card ?? 0);
        next.card = 0;
      }
      setAmounts(next);
      if (mine.length > 0) setAsOf(dayjs(mine[0].asOfDate));
      setPosition(cash);
      setEntries(scopeBranch ? list.filter((e) => e.branchId === scopeBranch) : list);
    } finally {
      setLoading(false);
    }
  }, [storeId, isOwner, scopeBranch, branchesOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const methodLabel: Record<MoneyMethod, string> = {
    cash: t.admin.mbkCashInHand,
    mobile_banking: t.admin.mbkMobile,
    card: t.admin.moCard,
    bank_transfer: t.admin.mbkBankOnly,
    online: t.admin.moOnline,
    other: t.admin.moOther,
  };
  const lineLabel = (line: OpeningLine) =>
    line === "fixed_assets" ? t.admin.mbkOpenFixed : line === "loans" ? t.admin.mbkOpenLoans : methodLabel[line];
  const typeLabel: Record<MoneyEntryType, string> = {
    owner_investment: t.admin.mbkTypeOwnerInvestment,
    loan_received: t.admin.mbkTypeLoanReceived,
    other_income: t.admin.mbkTypeOtherIncome,
    loan_repayment: t.admin.mbkTypeLoanRepayment,
    equipment_purchase: t.admin.mbkTypeEquipment,
    cash_over: t.admin.mbkTypeCashOver,
    cash_short: t.admin.mbkTypeCashShort,
  };
  const typeHint: Record<MoneyInType | MoneyOutType, string> = {
    owner_investment: t.admin.mbkHintOwnerInvestment,
    loan_received: t.admin.mbkHintLoanReceived,
    other_income: t.admin.mbkHintOtherIncome,
    loan_repayment: t.admin.mbkHintLoanRepayment,
    equipment_purchase: t.admin.mbkHintEquipment,
  };

  const needBranch = branchesOn && !branchId;

  const saveOpening = async () => {
    if (!storeId) return;
    if (needBranch) return showError(t.admin.mbkNeedBranch);
    setSavingOpening(true);
    try {
      const clean: Partial<Record<OpeningLine, number>> = {};
      for (const line of ALL_LINES) clean[line] = Math.max(Number(amounts[line] ?? 0), 0);
      const result = await saveOpeningBalances(storeId, { asOfDate: asOf.format("YYYY-MM-DD"), branchId: scopeBranch, amounts: clean });
      if (!result.success) return showError(result.error ?? t.admin.mbkFailed);
      success(t.admin.mbkOpenSaved);
      await load();
    } finally {
      setSavingOpening(false);
    }
  };

  const saveEntry = async () => {
    if (!storeId) return;
    if (needBranch) return showError(t.admin.mbkNeedBranch);
    if (!entryAmount || entryAmount <= 0) return showError(t.admin.mbkNeedAmount);
    setSavingEntry(true);
    try {
      const result = await addMoneyEntry(storeId, {
        kind: IN_TYPES.has(entryType) ? "in" : "out",
        entryType,
        amount: entryAmount,
        paymentMethod: entryMethod,
        date: entryDate.format("YYYY-MM-DD"),
        note: entryNote.trim() || undefined,
        branchId: scopeBranch,
        partnerId: PARTNER_TYPES.has(entryType) ? entryPartner : null,
        ...(entryType === "loan_repayment" && entryInterest ? { interestAmount: entryInterest } : {}),
      });
      if (!result.success) return showError(result.error ?? t.admin.mbkFailed);
      success(t.admin.mbkSaved);
      setEntryAmount(null);
      setEntryInterest(null);
      setEntryNote("");
      setEntryPartner(null);
      await load();
    } finally {
      setSavingEntry(false);
    }
  };

  const expectedCash = position?.methods.find((m) => m.method === "cash")?.left ?? 0;
  const difference = counted === null ? null : Math.round((counted - expectedCash) * 100) / 100;

  const saveCount = async () => {
    if (!storeId || counted === null) return;
    if (needBranch) return showError(t.admin.mbkNeedBranch);
    setSavingCount(true);
    try {
      const result = await recordCashCount(storeId, {
        date: dayjs().format("YYYY-MM-DD"),
        branchId: scopeBranch,
        counted,
        expected: expectedCash,
      });
      if (!result.success) return showError(result.error ?? t.admin.mbkFailed);
      success(t.admin.mbkCountSaved);
      setCounted(null);
      await load();
    } finally {
      setSavingCount(false);
    }
  };

  const removeEntry = async (id: string) => {
    if (!storeId) return;
    const result = await deleteMoneyEntry(storeId, id);
    if (!result.success) return showError(result.error ?? t.admin.mbkFailed);
    success(t.admin.mbkDeleted);
    await load();
  };

  const recent = useMemo(() => entries.slice(0, 30), [entries]);

  if (userLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }
  if (!isOwner) return <div className="p-6 text-sm text-muted-foreground">{t.admin.mbkOwnerOnly}</div>;

  const card = "rounded-2xl border border-border bg-card p-4 sm:p-5";
  const label = "block text-xs font-semibold text-muted-foreground mb-1";
  const summary = "cursor-pointer select-none text-sm font-semibold text-foreground";

  const numberBox = (line: OpeningLine) => (
    <div key={line}>
      <label htmlFor={`mbk-open-${line}`} className={label}>
        {lineLabel(line)}
      </label>
      <InputNumber
        id={`mbk-open-${line}`}
        min={0}
        precision={2}
        value={amounts[line] ?? null}
        onChange={(v) => setAmounts((prev) => ({ ...prev, [line]: v === null ? null : Number(v) }))}
        style={BOX}
      />
    </div>
  );

  // The same small form is the first step before anything is saved, and a folded-away option afterwards.
  const openingForm = (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{MAIN_LINES.map(numberBox)}</div>
      <details className="rounded-xl border border-border px-3 py-2">
        <summary className={summary}>{t.admin.mbkMoreOptions}</summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {MORE_LINES.map(numberBox)}
          <div>
            <label htmlFor="mbk-asof" className={label}>
              {t.admin.mbkOpenDate}
            </label>
            <DatePicker
              id="mbk-asof"
              format="DD-MM-YYYY"
              value={asOf}
              onChange={(d) => d && setAsOf(d)}
              allowClear={false}
              disabledDate={(d) => d.isAfter(dayjs(), "day")}
              style={BOX}
            />
          </div>
        </div>
      </details>
      <Button type="primary" loading={savingOpening} onClick={saveOpening}>
        {t.admin.mbkOpenSave}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
            <BookOpen size={20} aria-hidden="true" />
            {t.admin.mbkTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.admin.mbkSub}</p>
        </div>
        {branchesOn && (
          <div className="min-w-48">
            <label htmlFor="mbk-branch" className={label}>
              {t.admin.mbkBranch}
            </label>
            <Select
              id="mbk-branch"
              style={BOX}
              placeholder={t.admin.mbkBranchPh}
              value={branchId}
              onChange={setBranchId}
              options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {position && position.methods.length > 0 ? (
            <section className={card}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.mbkPositionTitle}</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">{money(position.total)}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {position.methods.map((m) => (
                  <li key={m.method} className="rounded-full border border-border px-3 py-1 text-xs">
                    <span className="text-muted-foreground">{methodLabel[m.method]} </span>
                    <span className={`font-bold tabular-nums ${m.left < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>{money(m.left)}</span>
                  </li>
                ))}
              </ul>
              <details className="mt-4">
                <summary className={summary}>{t.admin.mbkChangeStart}</summary>
                <div className="mt-3">{openingForm}</div>
              </details>
            </section>
          ) : (
            <section className={card}>
              <h2 className="text-base font-bold text-foreground">{t.admin.mbkSetupTitle}</h2>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t.admin.mbkOpenHelp}</p>
              {openingForm}
            </section>
          )}

          <section className={card}>
            <h2 className="text-base font-bold text-foreground">{t.admin.mbkChangedTitle}</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="mbk-type" className={label}>
                  {t.admin.mbkType}
                </label>
                <Select
                  id="mbk-type"
                  style={BOX}
                  value={entryType}
                  onChange={(v: MoneyInType | MoneyOutType) => setEntryType(v)}
                  options={ENTRY_TYPES.map((ty) => ({ value: ty, label: typeLabel[ty] }))}
                />
              </div>
              <div>
                <label htmlFor="mbk-amount" className={label}>
                  {t.admin.mbkAmount}
                </label>
                <InputNumber id="mbk-amount" min={0} precision={2} value={entryAmount} onChange={(v) => setEntryAmount(v === null ? null : Number(v))} style={BOX} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{typeHint[entryType]}</p>
            {entryType === "loan_repayment" && (
              <div className="mt-3 sm:max-w-sm">
                <label htmlFor="mbk-interest" className={label}>
                  {t.admin.mbkInterest}
                </label>
                <InputNumber
                  id="mbk-interest"
                  min={0}
                  precision={2}
                  value={entryInterest}
                  onChange={(v) => setEntryInterest(v === null ? null : Number(v))}
                  style={BOX}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">{t.admin.mbkInterestHint}</p>
              </div>
            )}
            {PARTNER_TYPES.has(entryType) && partners.length > 0 && (
              <div className="mt-3 sm:max-w-sm">
                <label htmlFor="mbk-who" className={label}>
                  {t.admin.mbkWho}
                </label>
                <Select
                  id="mbk-who"
                  style={BOX}
                  allowClear
                  placeholder={t.admin.mbkWhoPh}
                  value={entryPartner ?? undefined}
                  onChange={(v: string | undefined) => setEntryPartner(v ?? null)}
                  options={partners.map((p) => ({ value: p.id, label: p.name }))}
                />
              </div>
            )}
            <details className="mt-3">
              <summary className={summary}>{t.admin.mbkMoreDetails}</summary>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="mbk-method" className={label}>
                    {t.admin.mbkMethod}
                  </label>
                  <Select
                    id="mbk-method"
                    style={BOX}
                    value={entryMethod}
                    onChange={(v: MoneyMethod) => setEntryMethod(v)}
                    options={METHOD_CHOICES.map((m) => ({ value: m, label: methodLabel[m] }))}
                  />
                </div>
                <div>
                  <label htmlFor="mbk-date" className={label}>
                    {t.admin.mbkDate}
                  </label>
                  <DatePicker
                    id="mbk-date"
                    format="DD-MM-YYYY"
                    value={entryDate}
                    onChange={(d) => d && setEntryDate(d)}
                    allowClear={false}
                    disabledDate={(d) => d.isAfter(dayjs(), "day")}
                    style={BOX}
                  />
                </div>
                <div>
                  <label htmlFor="mbk-note" className={label}>
                    {t.admin.mbkNote}
                  </label>
                  <Input id="mbk-note" value={entryNote} onChange={(e) => setEntryNote(e.target.value)} maxLength={300} />
                </div>
              </div>
            </details>
            <Button type="primary" className="mt-4" loading={savingEntry} onClick={saveEntry}>
              {t.admin.mbkSave}
            </Button>
          </section>

          {position && (
            <details className={card}>
              <summary className={summary}>{t.admin.mbkCountTitle}</summary>
              <p className="mt-2 text-xs text-muted-foreground">{t.admin.mbkCountHelp}</p>
              <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
                <div>
                  <p className={label}>{t.admin.mbkExpected}</p>
                  <p className="text-base font-bold tabular-nums text-foreground">{money(expectedCash)}</p>
                </div>
                <div>
                  <label htmlFor="mbk-counted" className={label}>
                    {t.admin.mbkCounted}
                  </label>
                  <InputNumber id="mbk-counted" min={0} precision={2} value={counted} onChange={(v) => setCounted(v === null ? null : Number(v))} style={BOX} />
                </div>
                <div>
                  <p className={label}>{t.admin.mbkDifference}</p>
                  <p
                    className={`text-base font-bold tabular-nums ${
                      difference === null || difference === 0 ? "text-foreground" : difference > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {difference === null
                      ? "—"
                      : difference === 0
                        ? t.admin.mbkCountMatch
                        : (difference > 0 ? t.admin.mbkCountOver : t.admin.mbkCountShort).replace("{amount}", money(Math.abs(difference)))}
                  </p>
                </div>
                <Button loading={savingCount} onClick={saveCount} disabled={counted === null}>
                  {t.admin.mbkCountSave}
                </Button>
              </div>
            </details>
          )}

          <details className={card}>
            <summary className={summary}>{t.admin.mbkPartnersTitle}</summary>
            {summaries.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t.admin.mbkPartnersEmpty}</p>
            ) : (
              <ul className="mt-3 divide-y divide-border/70">
                {summaries.map((s) => (
                  <li key={s.partner.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="font-medium text-foreground">
                      {s.partner.name}{" "}
                      <span className="text-xs font-normal text-muted-foreground">({s.partner.kind === "owner" ? t.admin.fndKindOwner : t.admin.fndKindInvestor})</span>
                    </span>
                    <span className="flex gap-4 text-xs">
                      <span className="text-muted-foreground">
                        {t.admin.mbkPutIn} <b className="tabular-nums text-foreground">{money(s.capital)}</b>
                      </span>
                      <span className="text-muted-foreground">
                        {t.admin.mbkOwes} <b className={`tabular-nums ${s.owed > 0 ? "text-amber-700 dark:text-amber-300" : "text-foreground"}`}>{money(s.owed)}</b>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>

          <details className={card}>
            <summary className={summary}>{t.admin.mbkEntriesTitle}</summary>
            {recent.length === 0 ? (
              <div className="py-4">
                <Empty description={t.admin.mbkEntriesEmpty} />
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-border/70">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{typeLabel[e.entryType] ?? e.entryType}</p>
                      <p className="text-xs text-muted-foreground">
                        {n(dayjs(e.date).format("DD-MM-YYYY"))} · {methodLabel[e.paymentMethod] ?? e.paymentMethod}
                        {e.note ? ` · ${e.note}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`font-semibold tabular-nums ${e.kind === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {e.kind === "in" ? "+" : "−"}
                        {money(e.amount)}
                      </span>
                      <Popconfirm title={t.admin.mbkDeleteConfirm} okText={t.admin.mbkDelete} onConfirm={() => removeEntry(e.id)}>
                        <button type="button" className="text-muted-foreground hover:text-rose-600" aria-label={t.admin.mbkDelete}>
                          <Trash2 size={16} />
                        </button>
                      </Popconfirm>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </>
      )}
    </div>
  );
}
