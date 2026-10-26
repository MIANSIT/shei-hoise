"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Empty, Input, Modal, Popconfirm, Spin } from "antd";
import { BookOpen, HandCoins, Mail, MapPin, MessageCircle, Package, Pencil, Plus, ReceiptText, Search, Trash2, Truck } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier } from "@/lib/queries/supplier/suppliers";
import {
  whatsappNumber,
  type Supplier,
  type SupplierBalance,
  type SupplierEntryKind,
  type SupplierInput,
  type SupplierLedgerEntry,
} from "@/lib/queries/supplier/supplierTypes";
import {
  addSupplierEntry,
  deleteSupplierEntry,
  getSupplierBalances,
  getSupplierLedger,
} from "@/lib/queries/supplier/supplierLedger";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import {
  SupplierEntryModal,
  SupplierLedgerModal,
  type SupplierEntryValues,
} from "./SupplierMoneyModals";

const EMPTY_FORM: SupplierInput = { name: "", phone: "", email: "", address: "", notes: "" };

/**
 * Suppliers: the importers and wholesalers the store buys stock from. They are
 * assigned to products on the Stock List, and the Reorder List then splits what
 * to buy by supplier.
 */
export default function SuppliersPage() {
  const t = useTranslation();
  const n = useLocalNum();
  const { storeId, loading: userLoading } = useCurrentUser();
  const { can } = usePermissions();
  const canEdit = can("stock.edit");
  // What is owed to suppliers is its own permission, apart from managing the list.
  const canMoney = can("stock.supplier_money");
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const symbol = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const money = (amount: number) => `${symbol}${n(Math.round(amount).toLocaleString())}`;
  const { success, error: showError } = useSheiNotification();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [balances, setBalances] = useState<Record<string, SupplierBalance>>({});
  const [entryTarget, setEntryTarget] = useState<{ supplier: Supplier; kind: SupplierEntryKind } | null>(null);
  const [entrySaving, setEntrySaving] = useState(false);
  const [ledgerTarget, setLedgerTarget] = useState<Supplier | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<SupplierLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [list, balanceMap] = await Promise.all([
        getSuppliers(storeId),
        canMoney ? getSupplierBalances(storeId) : Promise.resolve({} as Record<string, SupplierBalance>),
      ]);
      setSuppliers(list);
      setBalances(balanceMap);
    } finally {
      setLoading(false);
    }
  }, [storeId, canMoney]);

  useEffect(() => {
    if (!userLoading) load();
  }, [userLoading, load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => s.name.toLowerCase().includes(q) || (s.phone ?? "").includes(q));
  }, [suppliers, search]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      notes: supplier.notes ?? "",
    });
    setFormOpen(true);
  };

  const submit = async () => {
    if (!storeId) return;
    if (!form.name.trim()) {
      showError(t.admin.spNameRequired);
      return;
    }
    setSaving(true);
    try {
      const result = editingId ? await updateSupplier(storeId, editingId, form) : await createSupplier(storeId, form);
      if (!result.success) {
        showError(result.error ?? t.admin.spFailed);
        return;
      }
      success(t.admin.spSaved);
      setFormOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!storeId) return;
    const result = await deleteSupplier(storeId, id);
    if (!result.success) {
      showError(result.error ?? t.admin.spFailed);
      return;
    }
    success(t.admin.spDeleted);
    await load();
  };

  const submitEntry = async (values: SupplierEntryValues) => {
    if (!storeId || !entryTarget) return;
    setEntrySaving(true);
    try {
      const result = await addSupplierEntry(storeId, {
        supplierId: entryTarget.supplier.id,
        kind: entryTarget.kind,
        amount: values.amount,
        date: values.date,
        paymentMethod: values.paymentMethod,
        paidFrom: values.paidFrom,
        branchId: values.branchId,
        note: values.note,
      });
      if (!result.success) {
        showError(result.error ?? t.admin.spFailed);
        return;
      }
      success(t.admin.slSaved);
      setEntryTarget(null);
      await load();
    } finally {
      setEntrySaving(false);
    }
  };

  const openLedger = async (supplier: Supplier) => {
    if (!storeId) return;
    setLedgerTarget(supplier);
    setLedgerLoading(true);
    try {
      setLedgerEntries(await getSupplierLedger(storeId, supplier.id));
    } finally {
      setLedgerLoading(false);
    }
  };

  const removeEntry = async (entryId: string) => {
    if (!storeId || !ledgerTarget) return;
    const result = await deleteSupplierEntry(storeId, entryId);
    if (!result.success) {
      showError(result.error ?? t.admin.spFailed);
      return;
    }
    success(t.admin.slEntryDeleted);
    setLedgerEntries(await getSupplierLedger(storeId, ledgerTarget.id));
    await load();
  };

  const totalDue = Object.values(balances).reduce((sum, b) => sum + Math.max(b.due, 0), 0);

  const field = (key: keyof SupplierInput) => ({
    value: form[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-400 to-rose-500 flex items-center justify-center shrink-0">
              <Truck size={18} color="white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground m-0 tracking-tight leading-tight">
                {t.admin.spTitle}
              </h1>
              <p className="text-xs text-muted-foreground m-0">{t.admin.spSub}</p>
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3.5 bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus size={15} aria-hidden="true" />
              {t.admin.spAdd}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-5">
        {canMoney && totalDue > 0.5 && (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-800 dark:text-rose-300">
            {t.admin.slAllDue}: <span className="font-bold tabular-nums">{money(totalDue)}</span>
          </div>
        )}

        {suppliers.length > 0 && (
          <div className="relative sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.admin.spSearch}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : suppliers.length === 0 ? (
          <Empty description={t.admin.spEmptyTitle}>
            <p className="text-xs text-muted-foreground m-0">{t.admin.spEmptySub}</p>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {shown.map((supplier) => {
              const wa = whatsappNumber(supplier.phone);
              return (
                <div key={supplier.id} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-base font-bold text-foreground truncate">{supplier.name}</div>
                      <Link
                        href={`/dashboard/products/stocks-update?supplier=${supplier.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <Package size={12} aria-hidden="true" />
                        {supplier.productCount > 0
                          ? t.admin.spProducts.replace("{n}", n(supplier.productCount))
                          : t.admin.spNoProducts}
                      </Link>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(supplier)}
                          aria-label={t.admin.spEdit}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <Popconfirm
                          title={t.admin.spDeleteConfirm}
                          okText={t.admin.spDelete}
                          cancelText={t.admin.spCancel}
                          onConfirm={() => remove(supplier.id)}
                        >
                          <button
                            type="button"
                            aria-label={t.admin.spDelete}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-muted transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </Popconfirm>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {supplier.phone && (
                      <div className="flex items-center gap-2">
                        <MessageCircle size={14} className="shrink-0" aria-hidden="true" />
                        {wa ? (
                          <a
                            href={`https://wa.me/${wa}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:underline"
                            title={t.admin.spOpenWhatsapp}
                          >
                            {supplier.phone}
                          </a>
                        ) : (
                          <span className="text-foreground">{supplier.phone}</span>
                        )}
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2 break-all">
                        <Mail size={14} className="shrink-0" aria-hidden="true" />
                        {supplier.email}
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                        {supplier.address}
                      </div>
                    )}
                    {supplier.notes && <p className="m-0 text-xs italic">{supplier.notes}</p>}
                  </div>

                  {canMoney && (
                    <div className="mt-auto space-y-2 border-t border-border pt-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t.admin.slBilled}</div>
                          <div className="text-sm font-bold tabular-nums text-foreground">{money(balances[supplier.id]?.billed ?? 0)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t.admin.slPaid}</div>
                          <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{money(balances[supplier.id]?.paid ?? 0)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t.admin.slDue}</div>
                          <div
                            className={`text-sm font-bold tabular-nums ${
                              (balances[supplier.id]?.due ?? 0) > 0.5 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                            }`}
                          >
                            {money(balances[supplier.id]?.due ?? 0)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEntryTarget({ supplier, kind: "bill" })}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                        >
                          <ReceiptText size={13} aria-hidden="true" />
                          {t.admin.slAddBill}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEntryTarget({ supplier, kind: "payment" })}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                        >
                          <HandCoins size={13} aria-hidden="true" />
                          {t.admin.slRecordPayment}
                        </button>
                        <button
                          type="button"
                          onClick={() => openLedger(supplier)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                        >
                          <BookOpen size={13} aria-hidden="true" />
                          {t.admin.slLedger}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SupplierEntryModal
        open={!!entryTarget}
        kind={entryTarget?.kind ?? "bill"}
        supplierName={entryTarget?.supplier.name ?? ""}
        saving={entrySaving}
        onSubmit={submitEntry}
        onCancel={() => setEntryTarget(null)}
      />

      <SupplierLedgerModal
        open={!!ledgerTarget}
        supplierName={ledgerTarget?.name ?? ""}
        entries={ledgerEntries}
        loading={ledgerLoading}
        money={money}
        onDelete={removeEntry}
        onClose={() => setLedgerTarget(null)}
      />

      <Modal
        open={formOpen}
        onCancel={saving ? undefined : () => setFormOpen(false)}
        onOk={submit}
        okText={t.admin.spSave}
        cancelText={t.admin.spCancel}
        confirmLoading={saving}
        title={editingId ? t.admin.spEdit : t.admin.spAdd}
        destroyOnHidden
      >
        <div className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.spName}</label>
            <Input {...field("name")} maxLength={80} className="mt-1" autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.spPhone}</label>
            <Input {...field("phone")} maxLength={30} className="mt-1" inputMode="tel" />
            <p className="m-0 mt-1 text-[11px] text-muted-foreground">{t.admin.spPhoneHint}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.spEmail}</label>
            <Input {...field("email")} maxLength={120} className="mt-1" inputMode="email" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.spAddress}</label>
            <Input {...field("address")} maxLength={200} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t.admin.spNotes}</label>
            <Input.TextArea {...field("notes")} maxLength={500} rows={2} className="mt-1" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
