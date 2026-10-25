"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DatePicker, InputNumber, Input, Modal, Popconfirm, Select, Spin } from "antd";
import dayjs, { Dayjs } from "dayjs";
import {
  Banknote,
  CreditCard,
  Globe,
  Landmark,
  PiggyBank,
  Smartphone,
  Truck,
  Users,
  Wallet,
  CircleDollarSign,
  ArrowRight,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useBranches } from "@/lib/context/BranchContext";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { MenuLabel } from "@/app/components/admin/common/MenuLabel";
import {
  getMoneyOverview,
  type MoneyMethodKey,
  type MoneyOverview as MoneyOverviewData,
} from "@/lib/queries/financial/getMoneyOverview";
import { getOwnerWithdrawals, type OwnerWithdrawal } from "@/lib/queries/financial/getOwnerWithdrawals";
import { deleteOwnerWithdrawal, recordOwnerWithdrawal } from "@/lib/queries/financial/ownerWithdrawals";

const EMPTY: MoneyOverviewData = {
  receivedTotal: 0,
  vendorReceivedTotal: 0,
  sources: { ordersThisPeriod: 0, ordersEarlier: 0, dueCollections: 0, vendorPayments: 0 },
  salesComparison: null,
  withdrawnTotal: 0,
  leftTotal: 0,
  byBranch: [],
  byMethod: [],
  pending: { customerDue: 0, codWithCourier: 0, vendorDue: 0, total: 0 },
};

type WithdrawMethod = Exclude<MoneyMethodKey, "cod">;
const WITHDRAW_METHODS: readonly WithdrawMethod[] = ["cash", "mobile_banking", "card", "bank_transfer", "online", "other"];

/** A stored withdrawal method as a known key (anything unexpected reads as "other"). */
function withdrawalMethod(raw: string): MoneyMethodKey {
  return (WITHDRAW_METHODS as readonly string[]).includes(raw) ? (raw as MoneyMethodKey) : "other";
}

const METHOD_ICON: Record<MoneyMethodKey, React.ReactNode> = {
  cash: <Banknote size={18} />,
  mobile_banking: <Smartphone size={18} />,
  card: <CreditCard size={18} />,
  bank_transfer: <Landmark size={18} />,
  online: <Globe size={18} />,
  cod: <Truck size={18} />,
  other: <CircleDollarSign size={18} />,
};

/**
 * "Where is my money?" — what came in over a period, split by how it was
 * paid (cash, mobile banking, card…), and what is still to collect right now
 * from customers, couriers and vendors.
 */
export default function MoneyOverview() {
  const { user, role } = useCurrentUser();
  const { success, error: showError } = useSheiNotification();
  // Withdrawals are the owner own business: only they can record or see them.
  const isOwner = role === "store_owner";
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const currencyIcon = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const t = useTranslation();
  const n = useLocalNum();
  const {
    enabled: branchesOn,
    loading: branchesLoading,
    selectedBranchId,
    selectedBranch,
    activeBranches,
    workBranchId,
    branchName,
    setSelectedBranchId,
  } = useBranches();
  const reportBranchId = branchesOn ? selectedBranchId : null;
  const headerBranchLabel = branchesOn ? (selectedBranch?.name ?? t.branches.allBranches) : null;

  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(29, "day"), dayjs()]);
  const [data, setData] = useState<MoneyOverviewData>(EMPTY);
  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wAmount, setWAmount] = useState<number | null>(null);
  const [wMethod, setWMethod] = useState<WithdrawMethod>("cash");
  // "withdraw" takes money out of the business; "move" changes the method it sits in (bKash → cash).
  const [wKind, setWKind] = useState<"withdraw" | "move">("withdraw");
  const [wToMethod, setWToMethod] = useState<WithdrawMethod>("cash");
  const [wDate, setWDate] = useState<Dayjs>(dayjs());
  const [wNotes, setWNotes] = useState("");
  const [wBranch, setWBranch] = useState<string | null>(null);

  const fromDate = range[0].format("YYYY-MM-DD");
  const toDate = range[1].format("YYYY-MM-DD");

  const load = useCallback(async () => {
    if (!user?.store_id || branchesLoading) return;
    setLoading(true);
    try {
      const [overview, withdrawalList] = await Promise.all([
        getMoneyOverview(user.store_id, fromDate, toDate, reportBranchId, branchesOn, isOwner),
        isOwner
          ? getOwnerWithdrawals(user.store_id, fromDate, toDate, reportBranchId).catch(() => [])
          : Promise.resolve([]),
      ]);
      setData(overview);
      setWithdrawals(withdrawalList);
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, fromDate, toDate, reportBranchId, branchesOn, branchesLoading, isOwner]);

  useEffect(() => {
    load();
  }, [load]);

  const openWithdraw = (kind: "withdraw" | "move" = "withdraw") => {
    setWAmount(null);
    setWKind(kind);
    // A cash-out usually starts from mobile banking and lands in cash.
    setWMethod(kind === "move" ? "mobile_banking" : "cash");
    setWToMethod("cash");
    setWDate(dayjs());
    setWNotes("");
    // A branch's own page records against that branch; on "All branches" start from the branch you work in.
    setWBranch(reportBranchId ?? workBranchId ?? activeBranches[0]?.id ?? null);
    setWithdrawOpen(true);
  };

  const handleWithdraw = async () => {
    if (!user?.store_id) return;
    if (!wAmount || wAmount <= 0) {
      showError(t.admin.moWithdrawAmountError);
      return;
    }
    if (branchesOn && !wBranch) {
      showError(t.admin.moChooseBranch);
      return;
    }
    if (wKind === "move" && wToMethod === wMethod) {
      showError(t.admin.moMoveSame);
      return;
    }
    setSaving(true);
    try {
      const result = await recordOwnerWithdrawal({
        storeId: user.store_id,
        amount: wAmount,
        paymentMethod: wMethod,
        withdrawalDate: wDate.format("YYYY-MM-DD"),
        notes: wNotes,
        branchId: branchesOn ? wBranch : null,
        ...(wKind === "move" ? { kind: "transfer" as const, toMethod: wToMethod } : {}),
      });
      if (!result.success) {
        showError(result.error ?? t.admin.moWithdrawFailed);
        return;
      }
      success(wKind === "move" ? t.admin.moMoved : t.admin.moWithdrawSaved);
      setWithdrawOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWithdrawal = async (id: string) => {
    if (!user?.store_id) return;
    const result = await deleteOwnerWithdrawal(user.store_id, id);
    if (!result.success) {
      showError(result.error ?? t.admin.moWithdrawFailed);
      return;
    }
    success(t.admin.moWithdrawDeleted);
    await load();
  };

  const money = (value: number) =>
    `${currencyIcon}${n(value.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}`;

  const methodLabel: Record<MoneyMethodKey, string> = {
    cash: t.admin.moCash,
    mobile_banking: t.admin.moMobileBanking,
    card: t.admin.moCard,
    bank_transfer: t.admin.moBankTransfer,
    online: t.admin.moOnline,
    cod: t.admin.moCod,
    other: t.admin.moOther,
  };

  const { pending } = data;

  // Where the money sits now: cash, and the digital methods, after anything cashed out.
  const DIGITAL_METHODS: readonly MoneyMethodKey[] = ["mobile_banking", "card", "bank_transfer", "online"];
  const cashRow = data.byMethod.find((r) => r.method === "cash");
  const digitalRows = data.byMethod.filter((r) => DIGITAL_METHODS.includes(r.method));
  const cashLeft = cashRow?.left ?? 0;
  const cashFromVendors = cashRow?.fromVendors ?? 0;
  const digitalFromVendors = digitalRows.reduce((sum, r) => sum + r.fromVendors, 0);
  const shownMethods = data.byMethod.filter(
    (r) => r.total > 0.005 || r.withdrawn > 0.005 || r.movedOut > 0.005 || r.movedIn > 0.005,
  );
  const vendorMethods = data.byMethod.filter((r) => r.fromVendors > 0.005);
  const cashedIntoCash = cashRow?.movedIn ?? 0;
  const digitalLeft = digitalRows.reduce((sum, r) => sum + r.left, 0);
  const digitalCashedOut = digitalRows.reduce((sum, r) => sum + r.movedOut - r.movedIn, 0);
  // COD from couriers and anything not recorded as cash or digital.
  const otherLeft = data.byMethod
    .filter((r) => r.method !== "cash" && !DIGITAL_METHODS.includes(r.method))
    .reduce((sum, r) => sum + r.left, 0);
  const pendingRows = [
    {
      key: "customers",
      icon: <Users size={18} />,
      label: t.admin.moPendingCustomers,
      hint: t.admin.moPendingCustomersHint,
      amount: pending.customerDue,
      href: "/dashboard/customers/dues",
    },
    {
      key: "cod",
      icon: <Truck size={18} />,
      label: t.admin.moPendingCod,
      hint: t.admin.moPendingCodHint,
      amount: pending.codWithCourier,
      href: "/dashboard/cod-settlements",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-sky-400 to-indigo-600 flex items-center justify-center shrink-0">
              <PiggyBank size={18} color="white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground m-0 tracking-tight leading-tight">
                <MenuLabel labelKey="menuMoneyOverview" />
              </h1>
              <p className="text-xs text-muted-foreground m-0">
                {headerBranchLabel && <span className="font-semibold text-indigo-700 dark:text-indigo-300">{headerBranchLabel} · </span>}
                {t.admin.moSubtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DatePicker.RangePicker
              format="DD-MM-YYYY"
              value={range}
              onChange={(v) => {
                if (v && v[0] && v[1]) setRange([v[0], v[1]]);
              }}
              allowClear={false}
              disabledDate={(d) => d.isAfter(dayjs(), "day")}
            />
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => openWithdraw("move")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  <ArrowRightLeft size={15} aria-hidden="true" />
                  {t.admin.moMoveMoney}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isOwner ? "lg:grid-cols-4" : ""}`}>
              <div className="rounded-2xl p-5 text-white bg-linear-to-br from-emerald-500 to-teal-600">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/85">
                  <Wallet size={16} aria-hidden="true" />
                  {t.admin.moReceived}
                </div>
                <div className="mt-2 text-3xl font-black tabular-nums break-words">{money(data.receivedTotal)}</div>
                <div className="mt-1 text-xs text-white/85">
                  {range[0].format("DD-MM-YYYY")} – {range[1].format("DD-MM-YYYY")}
                </div>
              </div>
              {isOwner && (
                <>
                  <div className="rounded-2xl p-5 text-white bg-linear-to-br from-sky-500 to-indigo-600">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/85">
                      <Banknote size={16} aria-hidden="true" />
                      {t.admin.moInCash}
                    </div>
                    <div className="mt-2 text-3xl font-black tabular-nums break-words">{money(cashLeft)}</div>
                    <div className="mt-1 text-xs text-white/85">
                      {[
                        cashedIntoCash > 0.005 ? t.admin.moCashIncludes.replace("{n}", money(cashedIntoCash)) : t.admin.moInCashSub,
                        cashFromVendors > 0.005 ? t.admin.moInclVendors.replace("{n}", money(cashFromVendors)) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className="rounded-2xl p-5 text-white bg-linear-to-br from-violet-500 to-purple-700">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/85">
                      <Smartphone size={16} aria-hidden="true" />
                      {t.admin.moInDigital}
                    </div>
                    <div className="mt-2 text-3xl font-black tabular-nums break-words">{money(digitalLeft)}</div>
                    <div className="mt-1 text-xs text-white/85">
                      {[
                        digitalCashedOut > 0.005 ? t.admin.moDigitalAfter.replace("{n}", money(digitalCashedOut)) : t.admin.moInDigitalSub,
                        digitalFromVendors > 0.005 ? t.admin.moInclVendors.replace("{n}", money(digitalFromVendors)) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </>
              )}
              <div className="rounded-2xl p-5 text-white bg-linear-to-br from-amber-500 to-orange-600">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/85">
                  <CircleDollarSign size={16} aria-hidden="true" />
                  {t.admin.moPending}
                </div>
                <div className="mt-2 text-3xl font-black tabular-nums break-words">{money(pending.total)}</div>
                <div className="mt-1 text-xs text-white/85">{t.admin.moPendingNow}</div>
              </div>
            </div>

            {isOwner && (Math.abs(otherLeft) > 0.005 || data.withdrawnTotal > 0.005) && (
              <p className="m-0 -mt-2 text-xs text-muted-foreground">
                {Math.abs(otherLeft) > 0.005 && (
                  <span className="mr-3">
                    {t.admin.moOtherLine}: <span className="font-semibold text-foreground tabular-nums">{money(otherLeft)}</span>
                  </span>
                )}
                {data.withdrawnTotal > 0.005 && (
                  <span>
                    {t.admin.moOwnerTook
                      .replace("{w}", money(data.withdrawnTotal))
                      .replace("{l}", money(data.leftTotal))}
                  </span>
                )}
              </p>
            )}

            <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
              <h2 className="text-sm font-bold text-foreground m-0">{t.admin.moByMethodTitle}</h2>
              <p className="text-xs text-muted-foreground m-0 mt-0.5 mb-4">{t.admin.moByMethodSub}</p>

              {shownMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground m-0 py-6 text-center">{t.admin.moNothingReceived}</p>
              ) : (
                <ul className="m-0 p-0 list-none space-y-4">
                  {shownMethods.map((row) => {
                    const share = data.receivedTotal > 0 ? (row.total / data.receivedTotal) * 100 : 0;
                    const sources = [
                      row.fromOrders > 0.005 ? `${t.admin.moSrcOrders} ${money(row.fromOrders)}` : null,
                      row.fromDues > 0.005 ? `${t.admin.moSrcDues} ${money(row.fromDues)}` : null,
                    ].filter((s): s is string => s !== null);
                    return (
                      <li key={row.method}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                              {METHOD_ICON[row.method]}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground">{methodLabel[row.method]}</div>
                              {sources.length > 0 && (
                                <div className="text-[11px] text-muted-foreground break-words">{sources.join(" · ")}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold tabular-nums text-foreground">{money(row.total)}</div>
                            {isOwner && (row.withdrawn > 0.005 || row.movedOut > 0.005 || row.movedIn > 0.005) ? (
                              <div className="text-[11px] text-muted-foreground tabular-nums">
                                {row.withdrawn > 0.005 && <>−{money(row.withdrawn)} · </>}
                                {row.movedOut > 0.005 && <>{t.admin.moMovedOut} {money(row.movedOut)} · </>}
                                {row.movedIn > 0.005 && <>{t.admin.moMovedIn} {money(row.movedIn)} · </>}
                                {t.admin.moLeftShort} {money(row.left)}
                              </div>
                            ) : (
                              <div className="text-[11px] text-muted-foreground tabular-nums">{n(share.toFixed(1))}%</div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(share, 100)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="m-0 mt-1.5 text-[11px] text-muted-foreground">
                {t.admin.moByMethodNote} {t.admin.moByMethodVendorNote}
              </p>
            </section>

            {/* Sales and money are different things; this sets them side by side so the gap makes sense. */}
            <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
              <h2 className="text-sm font-bold text-foreground m-0">{t.admin.moWhyTitle}</h2>
              <p className="text-xs text-muted-foreground m-0 mt-0.5 mb-4">{t.admin.moWhySub}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.salesComparison && (
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.admin.moSalesCol}</div>
                    <dl className="m-0 mt-2 space-y-1.5 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{t.admin.moSalesAll}</dt>
                        <dd className="m-0 font-bold tabular-nums text-foreground">{money(data.salesComparison.sales)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{t.admin.moSalesPaid}</dt>
                        <dd className="m-0 tabular-nums text-foreground">{money(data.salesComparison.received)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{t.admin.moSalesUnpaid}</dt>
                        <dd className="m-0 tabular-nums text-foreground">{money(data.salesComparison.unpaid)}</dd>
                      </div>
                    </dl>
                  </div>
                )}
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.admin.moMoneyCol}</div>
                  <dl className="m-0 mt-2 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t.admin.moFromOrdersNow}</dt>
                      <dd className="m-0 tabular-nums text-foreground">{money(data.sources.ordersThisPeriod)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t.admin.moFromOrdersEarlier}</dt>
                      <dd className="m-0 tabular-nums text-foreground">{money(data.sources.ordersEarlier)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t.admin.moSrcDues}</dt>
                      <dd className="m-0 tabular-nums text-foreground">{money(data.sources.dueCollections)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-border pt-1.5">
                      <dt className="font-semibold text-foreground">{t.admin.moReceived}</dt>
                      <dd className="m-0 font-bold tabular-nums text-foreground">{money(data.receivedTotal)}</dd>
                    </div>
                    {data.sources.vendorPayments > 0.005 && (
                      <div className="flex justify-between gap-3 text-xs">
                        <dt className="text-muted-foreground">{t.admin.moVendorLine}</dt>
                        <dd className="m-0 tabular-nums text-muted-foreground">{money(data.sources.vendorPayments)}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
              <p className="m-0 mt-3 text-[11px] text-muted-foreground">{t.admin.moWhyNote}</p>
            </section>

            {branchesOn && !reportBranchId && data.byBranch.length > 0 && (
              <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
                <h2 className="text-sm font-bold text-foreground m-0">{t.admin.moByBranchTitle}</h2>
                <p className="text-xs text-muted-foreground m-0 mt-0.5 mb-4">{t.admin.moByBranchSub}</p>
                <ul className="m-0 p-0 list-none divide-y divide-border">
                  {data.byBranch.map((b) => (
                    <li key={b.branchId ?? "none"}>
                      <button
                        type="button"
                        disabled={!b.branchId}
                        onClick={() => b.branchId && setSelectedBranchId(b.branchId)}
                        className="w-full flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 text-left hover:opacity-80 transition-opacity disabled:cursor-default disabled:hover:opacity-100"
                        title={b.branchId ? t.branches.cmpOpenBranch : undefined}
                      >
                        <span className="text-sm font-semibold text-foreground truncate">
                          {b.branchId ? branchName(b.branchId) : t.admin.moNoBranch}
                        </span>
                        <span className="text-right shrink-0">
                          <span className="block text-sm font-bold tabular-nums text-foreground">{money(b.received)}</span>
                          {isOwner && b.withdrawn > 0.005 && (
                            <span className="block text-[11px] text-muted-foreground tabular-nums">
                              −{money(b.withdrawn)} · {t.admin.moLeftShort} {money(b.left)}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {isOwner && (
              <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
                <h2 className="text-sm font-bold text-foreground m-0">{t.admin.moWithdrawalsTitle}</h2>
                <p className="text-xs text-muted-foreground m-0 mt-0.5 mb-4">{t.admin.moWithdrawalsSub}</p>
                {withdrawals.length === 0 ? (
                  <p className="text-sm text-muted-foreground m-0 py-4 text-center">{t.admin.moNoWithdrawals}</p>
                ) : (
                  <ul className="m-0 p-0 list-none divide-y divide-border">
                    {withdrawals.map((w) => (
                      <li key={w.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                            {w.kind === "transfer" && w.to_method
                              ? `${methodLabel[withdrawalMethod(w.payment_method)]} → ${methodLabel[withdrawalMethod(w.to_method)]}`
                              : methodLabel[withdrawalMethod(w.payment_method)]}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {dayjs(w.withdrawal_date).format("DD-MM-YYYY")}
                              {branchesOn && w.branch_id ? ` · ${branchName(w.branch_id)}` : ""}
                            </span>
                          </div>
                          {w.notes && <div className="text-[11px] text-muted-foreground break-words">{w.notes}</div>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold tabular-nums text-foreground">
                            {w.kind === "transfer" ? "" : "−"}
                            {money(w.amount)}
                          </span>
                          <Popconfirm
                            title={t.admin.moDeleteWithdrawalConfirm}
                            okText={t.admin.moDelete}
                            cancelText={t.admin.moCancel}
                            onConfirm={() => handleDeleteWithdrawal(w.id)}
                          >
                            <button
                              type="button"
                              aria-label={t.admin.moDelete}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-muted transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </Popconfirm>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
              <h2 className="text-sm font-bold text-foreground m-0">{t.admin.moPendingTitle}</h2>
              <p className="text-xs text-muted-foreground m-0 mt-0.5 mb-4">{t.admin.moPendingSub}</p>
              <ul className="m-0 p-0 list-none divide-y divide-border">
                {pendingRows.map((row) => (
                  <li key={row.key}>
                    <Link
                      href={row.href}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                          {row.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">{row.label}</div>
                          <div className="text-[11px] text-muted-foreground">{row.hint}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold tabular-nums text-foreground">{money(row.amount)}</span>
                        <ArrowRight size={14} className="text-muted-foreground" aria-hidden="true" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Vendors are kept apart so they never blur the shop's own numbers. */}
            {(data.vendorReceivedTotal > 0.005 || pending.vendorDue > 0.005) && (
              <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
                <h2 className="text-sm font-bold text-foreground m-0">{t.admin.moVendorsTitle}</h2>
                <p className="text-xs text-muted-foreground m-0 mt-0.5 mb-4">{t.admin.moVendorsSub}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t.admin.moVendorsReceived}
                    </div>
                    <div className="mt-1 text-xl font-black tabular-nums text-foreground">{money(data.vendorReceivedTotal)}</div>
                    {vendorMethods.length > 0 && (
                      <ul className="m-0 mt-2 p-0 list-none space-y-0.5 text-xs text-muted-foreground">
                        {vendorMethods.map((r) => (
                          <li key={r.method} className="flex justify-between gap-3">
                            <span>{methodLabel[r.method]}</span>
                            <span className="tabular-nums text-foreground">{money(r.fromVendors)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Link
                    href="/dashboard/vendors"
                    className="rounded-xl border border-border p-3 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.admin.moPendingVendors}
                      </span>
                      <ArrowRight size={14} className="text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="mt-1 text-xl font-black tabular-nums text-foreground">{money(pending.vendorDue)}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {reportBranchId ? t.admin.moPendingVendorsStoreWide : t.admin.moPendingVendorsHint}
                    </div>
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Modal
        open={withdrawOpen}
        onCancel={saving ? undefined : () => setWithdrawOpen(false)}
        onOk={handleWithdraw}
        okText={t.admin.moSaveWithdrawal}
        cancelText={t.admin.moCancel}
        confirmLoading={saving}
        title={wKind === "move" ? t.admin.moMoveMoney : t.admin.moRecordWithdrawal}
        destroyOnHidden
      >
        <p className="text-xs text-muted-foreground mt-0 mb-4">
          {wKind === "move" ? t.admin.moMoveExplain : t.admin.moWithdrawExplain}
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.moAmount}</label>
            <InputNumber min={0} value={wAmount} onChange={(v) => setWAmount(v)} className="w-full mt-1" autoFocus />
          </div>
          {branchesOn && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{t.admin.moBranch}</label>
              <Select
                value={wBranch ?? undefined}
                onChange={setWBranch}
                className="w-full mt-1"
                placeholder={t.admin.moChooseBranch}
                options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
              />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                {wKind === "move" ? t.admin.moMoveFrom : t.admin.moTakenFrom}
              </label>
              <Select
                value={wMethod}
                onChange={setWMethod}
                className="w-full mt-1"
                options={WITHDRAW_METHODS.map((m) => ({ value: m, label: methodLabel[m] }))}
              />
            </div>
            {wKind === "move" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground">{t.admin.moMoveTo}</label>
                <Select
                  value={wToMethod}
                  onChange={setWToMethod}
                  className="w-full mt-1"
                  options={WITHDRAW_METHODS.filter((m) => m !== wMethod).map((m) => ({ value: m, label: methodLabel[m] }))}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{t.admin.moDate}</label>
              <DatePicker
                format="DD-MM-YYYY"
                value={wDate}
                onChange={(d) => d && setWDate(d)}
                allowClear={false}
                disabledDate={(d) => d.isAfter(dayjs(), "day")}
                className="w-full mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.moNote}</label>
            <Input.TextArea value={wNotes} onChange={(e) => setWNotes(e.target.value)} rows={2} className="mt-1" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
