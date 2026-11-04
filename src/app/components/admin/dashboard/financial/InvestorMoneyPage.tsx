"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { Button, DatePicker, Input, InputNumber, Popconfirm, Select, Spin } from "antd";
import { Trash2, Wallet } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useBranches } from "@/lib/context/BranchContext";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { addInvestorMoney, deleteInvestorEntry, getInvestorOverview, saveStartingCash } from "@/lib/queries/financial/investorMoney";
import { getCashPosition } from "@/lib/queries/financial/getCashPosition";
import { START_METHODS, type InvestorKind, type InvestorOverview, type StartMethod } from "@/lib/queries/financial/investorMoneyTypes";
import type { CashPosition } from "@/lib/queries/financial/moneyBookTypes";
import { InvestorPayModal, type InvestorPayTarget } from "./InvestorPayModal";
import { ProfitShareCard } from "./ProfitShareCard";

const BOX = { width: "100%" } as const;
const NEW_PERSON = "__new__";

/**
 * Investor money, kept short: tell it your starting cash once, add the money people give you (a loan, or an
 * investment that shares profit or is paid back), and pay them back. Business cash (what your sales made) and the
 * Investor account (what people put in) never mix, and neither changes your sales or profit. Owner only.
 */
export default function InvestorMoneyPage() {
  const t = useTranslation();
  const n = useLocalNum();
  const { storeId, loading: userLoading } = useCurrentUser();
  const { isOwner } = usePermissions();
  const { allowed: investorAllowed, loading: gateLoading } = useFeatureGate(storeId, "investor_money");
  const { enabled: branchesOn, activeBranches, workBranchId } = useBranches();
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const symbol = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const money = useCallback(
    (amount: number) => `${amount < 0 ? "−" : ""}${symbol}${n(Math.abs(Math.round(amount * 100) / 100).toLocaleString())}`,
    [symbol, n],
  );
  const { success, error: showError } = useSheiNotification();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<InvestorOverview | null>(null);
  const [position, setPosition] = useState<CashPosition | null>(null);
  const [payTarget, setPayTarget] = useState<InvestorPayTarget | null>(null);

  // Starting cash form.
  const [startBranch, setStartBranch] = useState<string | null>(null);
  const [startAmounts, setStartAmounts] = useState<Partial<Record<StartMethod, number | null>>>({});
  const [startDate, setStartDate] = useState<Dayjs>(dayjs());
  const [savingStart, setSavingStart] = useState(false);

  // Add investor money form.
  const [person, setPerson] = useState<string | undefined>(undefined);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<"owner" | "investor">("investor");
  const [kind, setKind] = useState<InvestorKind>("profit_share");
  const [pct, setPct] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [ov, pos] = await Promise.all([getInvestorOverview(storeId), getCashPosition(storeId, null, branchesOn).catch(() => null)]);
      setOverview(ov);
      setPosition(pos);
    } finally {
      setLoading(false);
    }
  }, [storeId, branchesOn]);

  useEffect(() => {
    void load();
  }, [load]);

  // A branch store counts the starting cash branch by branch: start on the branch you work in.
  useEffect(() => {
    if (branchesOn && !startBranch) setStartBranch(workBranchId ?? activeBranches[0]?.id ?? null);
  }, [branchesOn, startBranch, workBranchId, activeBranches]);

  // Show the saved numbers for the picked branch when changing the starting cash.
  useEffect(() => {
    if (!overview) return;
    const rows = overview.start.filter((r) => (branchesOn ? r.branchId === startBranch : r.branchId === null));
    setStartAmounts(Object.fromEntries(rows.map((r) => [r.method, r.amount])));
    if (rows.length > 0) setStartDate(dayjs(rows[0].asOfDate));
  }, [overview, startBranch, branchesOn]);

  const methodLabel: Record<StartMethod, string> = {
    cash: t.admin.mbkCashInHand,
    mobile_banking: t.admin.mbkMobile,
    bank_transfer: t.admin.mbkBankOnly,
  };
  const kindLabel: Record<InvestorKind, string> = {
    loan: t.admin.invKindLoan,
    profit_share: t.admin.invKindShare,
    payback: t.admin.invKindPayback,
  };
  const kindHint: Record<InvestorKind, string> = {
    loan: t.admin.invHintLoan,
    profit_share: t.admin.invHintShare,
    payback: t.admin.invHintPayback,
  };
  const entryLabel = (type: string): string =>
    ({ put_in: t.admin.invEntryPutIn, repay: t.admin.invEntryRepay, pay_back: t.admin.invEntryPayBack, profit_share_paid: t.admin.invEntryShare })[type] ?? type;

  const saveStart = async () => {
    if (!storeId) return;
    if (branchesOn && !startBranch) return showError(t.admin.mbkNeedBranch);
    setSavingStart(true);
    try {
      const amounts: Partial<Record<StartMethod, number>> = {};
      for (const m of START_METHODS) amounts[m] = startAmounts[m] ?? 0;
      const result = await saveStartingCash(storeId, { asOfDate: startDate.format("YYYY-MM-DD"), branchId: branchesOn ? startBranch : null, amounts });
      if (!result.success) return showError(result.error ?? t.admin.invFailed);
      success(t.admin.invStartSaved);
      await load();
    } finally {
      setSavingStart(false);
    }
  };

  const addMoney = async () => {
    if (!storeId) return;
    if (!person) return showError(t.admin.invNeedPerson);
    if (person === NEW_PERSON && !newName.trim()) return showError(t.admin.invNeedName);
    if (kind === "profit_share" && (pct === null || pct <= 0)) return showError(t.admin.invNeedPct);
    if (amount === null || amount <= 0) return showError(t.admin.invNeedAmount);
    setSaving(true);
    try {
      const result = await addInvestorMoney(storeId, {
        ...(person === NEW_PERSON ? { newPersonName: newName.trim(), newPersonKind: newKind } : { partnerId: person }),
        kind,
        profitSharePct: kind === "profit_share" ? pct : null,
        amount,
        date: date.format("YYYY-MM-DD"),
        note: note || undefined,
      });
      if (!result.success) return showError(result.error ?? t.admin.invFailed);
      success(t.admin.invSaved);
      setAmount(null);
      setNote("");
      setNewName("");
      setPerson(undefined);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (id: string) => {
    if (!storeId) return;
    const result = await deleteInvestorEntry(storeId, id);
    if (!result.success) return showError(result.error ?? t.admin.invFailed);
    success(t.admin.invDeleted);
    await load();
  };

  const partnerName = useMemo(() => {
    const dealOwner = new Map(overview?.deals.map((d) => [d.id, d.partnerId]) ?? []);
    const names = new Map(overview?.positions.partners.map((p) => [p.partner.id, p.partner.name]) ?? []);
    return (dealId: string) => names.get(dealOwner.get(dealId) ?? "") ?? "";
  }, [overview]);

  if (userLoading || gateLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }
  if (!isOwner) return <div className="p-6 text-sm text-muted-foreground">{t.admin.invOwnerOnly}</div>;

  const card = "rounded-2xl border border-border bg-card p-4 sm:p-5";
  const label = "block text-xs font-semibold text-muted-foreground mb-1";
  const started = !!overview?.goLive;
  const partners = overview?.positions.partners ?? [];
  const withDeals = partners.filter((p) => p.deals.length > 0);

  const startForm = (
    <div className="space-y-3">
      {branchesOn && (
        <div className="max-w-xs">
          <label htmlFor="inv-start-branch" className={label}>
            {t.admin.mbkBranch}
          </label>
          <Select
            id="inv-start-branch"
            style={BOX}
            placeholder={t.admin.mbkBranchPh}
            value={startBranch ?? undefined}
            onChange={setStartBranch}
            options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
          />
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {START_METHODS.map((m) => (
          <div key={m}>
            <label htmlFor={`inv-start-${m}`} className={label}>
              {methodLabel[m]}
            </label>
            <InputNumber
              id={`inv-start-${m}`}
              min={0}
              precision={2}
              value={startAmounts[m] ?? null}
              onChange={(v) => setStartAmounts((prev) => ({ ...prev, [m]: v === null ? null : Number(v) }))}
              style={BOX}
            />
          </div>
        ))}
      </div>
      <div className="max-w-xs">
        <label htmlFor="inv-start-date" className={label}>
          {t.admin.invStartDate}
        </label>
        <DatePicker id="inv-start-date" format="DD-MM-YYYY" value={startDate} onChange={(d) => d && setStartDate(d)} allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} style={BOX} />
        <p className="m-0 mt-1 text-[11px] text-muted-foreground">{t.admin.invStartDateHint}</p>
      </div>
      <Button type="primary" loading={savingStart} onClick={saveStart}>
        {t.admin.invStartSave}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 py-5 sm:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
          <Wallet size={20} aria-hidden="true" />
          {t.admin.invTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.admin.invSub}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : !started ? (
        <section className={card}>
          <h2 className="m-0 text-base font-bold text-foreground">{t.admin.invSetupTitle}</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">{t.admin.invSetupHelp}</p>
          {startForm}
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border border-t-4 border-t-teal-500 bg-card p-4 sm:p-5">
              <p className="m-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.invBusinessCash}</p>
              <p className="m-0 mt-1 text-2xl font-extrabold tabular-nums text-foreground">{position ? money(position.total) : "—"}</p>
              <p className="m-0 mt-1 text-xs text-muted-foreground">{t.admin.invBusinessCashHint}</p>
            </div>
            <div className="rounded-2xl border border-border border-t-4 border-t-violet-500 bg-card p-4 sm:p-5">
              <p className="m-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.invAccount}</p>
              <p className="m-0 mt-1 text-2xl font-extrabold tabular-nums text-foreground">{money(overview?.positions.accountTotal ?? 0)}</p>
              <p className="m-0 mt-1 text-xs text-muted-foreground">{t.admin.invAccountHint}</p>
            </div>
          </section>

          {!investorAllowed ? (
            <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{t.admin.invNotInPlan}</p>
          ) : (
            <>
              <section className={card}>
                <h2 className="m-0 text-base font-bold text-foreground">{t.admin.invAddTitle}</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="inv-person" className={label}>
                      {t.admin.invPerson}
                    </label>
                    <Select
                      id="inv-person"
                      style={BOX}
                      placeholder={t.admin.invPersonPh}
                      value={person}
                      onChange={setPerson}
                      options={[
                        ...partners.map((p) => ({ value: p.partner.id, label: p.partner.name })),
                        { value: NEW_PERSON, label: `+ ${t.admin.invNewPerson}` },
                      ]}
                    />
                  </div>
                  {person === NEW_PERSON && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="inv-new-name" className={label}>
                          {t.admin.fndName}
                        </label>
                        <Input id="inv-new-name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} />
                      </div>
                      <div>
                        <label htmlFor="inv-new-kind" className={label}>
                          {t.admin.invPersonKind}
                        </label>
                        <Select
                          id="inv-new-kind"
                          style={BOX}
                          value={newKind}
                          onChange={setNewKind}
                          options={[
                            { value: "investor", label: t.admin.fndKindInvestor },
                            { value: "owner", label: t.admin.fndKindOwner },
                          ]}
                        />
                      </div>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label htmlFor="inv-kind" className={label}>
                      {t.admin.invKind}
                    </label>
                    <Select
                      id="inv-kind"
                      style={BOX}
                      value={kind}
                      onChange={setKind}
                      options={(["loan", "profit_share", "payback"] as const).map((k) => ({ value: k, label: kindLabel[k] }))}
                    />
                    <p className="m-0 mt-1 text-xs text-muted-foreground">{kindHint[kind]}</p>
                  </div>
                  {kind === "profit_share" && (
                    <div>
                      <label htmlFor="inv-pct" className={label}>
                        {t.admin.invPct}
                      </label>
                      <InputNumber id="inv-pct" min={0} max={100} precision={2} value={pct} onChange={(v) => setPct(v === null ? null : Number(v))} style={BOX} addonAfter="%" />
                    </div>
                  )}
                  <div>
                    <label htmlFor="inv-amount" className={label}>
                      {t.admin.invAmount}
                    </label>
                    <InputNumber id="inv-amount" min={0} precision={2} value={amount} onChange={(v) => setAmount(v === null ? null : Number(v))} style={BOX} />
                  </div>
                  <div>
                    <label htmlFor="inv-date" className={label}>
                      {t.admin.mbkDate}
                    </label>
                    <DatePicker
                      id="inv-date"
                      format="DD-MM-YYYY"
                      value={date}
                      onChange={(d) => d && setDate(d)}
                      allowClear={false}
                      disabledDate={(d) => d.isAfter(dayjs(), "day") || (!!overview?.goLive && d.isBefore(dayjs(overview.goLive), "day"))}
                      style={BOX}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="inv-note" className={label}>
                      {t.admin.mbkNote}
                    </label>
                    <Input id="inv-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
                  </div>
                </div>
                <div className="mt-3">
                  <Button type="primary" loading={saving} onClick={addMoney}>
                    {t.admin.invAddSave}
                  </Button>
                </div>
                <p className="m-0 mt-2 text-[11px] text-muted-foreground">{t.admin.invAddNote}</p>
              </section>

              <section className={card}>
                <h2 className="m-0 text-base font-bold text-foreground">{t.admin.invPeopleTitle}</h2>
                {withDeals.length === 0 ? (
                  <p className="m-0 mt-2 text-sm text-muted-foreground">{t.admin.invPeopleEmpty}</p>
                ) : (
                  <ul className="mt-3 list-none space-y-4 p-0">
                    {withDeals.map((p) => (
                      <li key={p.partner.id} className="rounded-xl border border-border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="m-0 text-sm font-bold text-foreground">
                            {p.partner.name}{" "}
                            <span className="text-xs font-normal text-muted-foreground">({p.partner.kind === "owner" ? t.admin.fndKindOwner : t.admin.fndKindInvestor})</span>
                          </p>
                          <p className="m-0 text-xs text-muted-foreground">
                            {t.admin.invInAccount} <b className="tabular-nums text-foreground">{money(p.available)}</b>
                          </p>
                        </div>
                        <ul className="mt-2 list-none divide-y divide-border p-0">
                          {p.deals.map((d) => {
                            const isLoan = d.deal.kind === "loan";
                            return (
                              <li key={d.deal.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                                <div className="min-w-0">
                                  <p className="m-0 font-medium text-foreground">
                                    {isLoan ? t.admin.invKindLoan : d.deal.kind === "profit_share" ? t.admin.invDealShare.replace("{pct}", String(d.deal.profitSharePct)) : t.admin.invKindPayback}
                                  </p>
                                  <p className="m-0 text-xs text-muted-foreground">
                                    {t.admin.invDealLine
                                      .replace("{putIn}", money(d.putIn))
                                      .replace("{paidBack}", money(d.paidBack))
                                      .replace("{left}", money(d.left))
                                      .replace("{leftLabel}", isLoan ? t.admin.invLeftOwed : t.admin.invLeftCapital)}
                                    {d.deal.kind === "profit_share" ? ` · ${t.admin.invSharesPaid.replace("{amount}", money(d.sharePaid))}` : ""}
                                  </p>
                                </div>
                                <Button size="small" disabled={d.left <= 0.005} onClick={() => setPayTarget({ mode: "payback", partner: p, deal: d })}>
                                  {isLoan ? t.admin.invRepay : t.admin.invPayBack}
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {overview && <ProfitShareCard storeId={storeId ?? ""} overview={overview} money={money} onPay={setPayTarget} />}

              <details className={card}>
                <summary className="cursor-pointer select-none text-sm font-semibold text-foreground">{t.admin.invHistoryTitle}</summary>
                {(overview?.entries ?? []).length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">{t.admin.mbkEntriesEmpty}</p>
                ) : (
                  <ul className="mt-3 list-none divide-y divide-border p-0">
                    {(overview?.entries ?? []).slice(0, 40).map((e) => (
                      <li key={e.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="m-0 font-medium text-foreground">
                            {partnerName(e.dealId)} · {entryLabel(e.type)}
                          </p>
                          <p className="m-0 text-xs text-muted-foreground">
                            {n(dayjs(e.date).format("DD-MM-YYYY"))}
                            {e.payFrom ? ` · ${e.payFrom === "business" ? t.admin.invFromBusiness : t.admin.invFromInvestor}` : ""}
                            {e.periodMonth ? ` · ${e.periodMonth}` : ""}
                            {e.note ? ` · ${e.note}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className={`font-semibold tabular-nums ${e.type === "put_in" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {e.type === "put_in" ? "+" : "−"}
                            {money(e.amount)}
                          </span>
                          <Popconfirm title={t.admin.mbkDeleteConfirm} okText={t.admin.mbkDelete} onConfirm={() => removeEntry(e.id)}>
                            <button type="button" aria-label={t.admin.mbkDelete} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-rose-600">
                              <Trash2 size={15} />
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

          <details className={card}>
            <summary className="cursor-pointer select-none text-sm font-semibold text-foreground">{t.admin.invChangeStart}</summary>
            <div className="mt-3">{startForm}</div>
          </details>
        </>
      )}

      {storeId && <InvestorPayModal storeId={storeId} target={payTarget} money={money} onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); void load(); }} />}
    </div>
  );
}
