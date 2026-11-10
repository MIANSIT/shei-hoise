"use client";

import { useEffect, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker, Input, InputNumber, Modal, Select } from "antd";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { addInvestorMoney, getInvestorAvailable } from "@/lib/queries/financial/investorMoney";
import type { InvestorAvailable, InvestorKind } from "@/lib/queries/financial/investorMoneyTypes";

const BOX = { width: "100%" } as const;
const NEW_PERSON = "__new__";

interface PreviousInvestmentModalProps {
  storeId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Records money a person put in before the store started using Investor money. It adds to what the business owes
 * them, and leaves the Investor account, Business cash, sales and profit as they are.
 */
export function PreviousInvestmentModal({ storeId, open, onClose }: PreviousInvestmentModalProps) {
  const t = useTranslation();
  const { success, error: showError } = useSheiNotification();
  const [people, setPeople] = useState<InvestorAvailable[]>([]);
  const [person, setPerson] = useState<string | undefined>(undefined);
  const [newName, setNewName] = useState("");
  const [kind, setKind] = useState<InvestorKind>("profit_share");
  const [pct, setPct] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPerson(undefined);
    setNewName("");
    setKind("profit_share");
    setPct(null);
    setAmount(null);
    setDate(dayjs());
    setNote("");
    getInvestorAvailable(storeId).then((list) => {
      if (!cancelled) setPeople(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open, storeId]);

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

  const save = async () => {
    if (!person) return showError(t.admin.invNeedPerson);
    if (person === NEW_PERSON && !newName.trim()) return showError(t.admin.invNeedName);
    if (kind === "profit_share" && (pct === null || pct <= 0)) return showError(t.admin.invNeedPct);
    if (amount === null || amount <= 0) return showError(t.admin.invNeedAmount);
    setSaving(true);
    try {
      const result = await addInvestorMoney(storeId, {
        ...(person === NEW_PERSON ? { newPersonName: newName.trim(), newPersonKind: "investor" as const } : { partnerId: person }),
        kind,
        profitSharePct: kind === "profit_share" ? pct : null,
        amount,
        date: date.format("YYYY-MM-DD"),
        note: note || undefined,
        previous: true,
      });
      if (!result.success) return showError(result.error ?? t.admin.invFailed);
      success(t.admin.invSaved);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const label = "block text-xs font-semibold text-muted-foreground mb-1";

  return (
    <Modal open={open} onCancel={() => !saving && onClose()} onOk={save} okText={t.admin.invSave} cancelText={t.admin.spCancel} confirmLoading={saving} title={t.admin.invPrevTitle} destroyOnHidden>
      <div className="space-y-3">
        <p className="m-0 text-xs text-muted-foreground">{t.admin.invPrevSub}</p>
        <div>
          <label htmlFor="prev-person" className={label}>
            {t.admin.invPerson}
          </label>
          <Select
            id="prev-person"
            style={BOX}
            placeholder={t.admin.invPersonPh}
            value={person}
            onChange={setPerson}
            options={[...people.map((p) => ({ value: p.partner.id, label: p.partner.name })), { value: NEW_PERSON, label: `+ ${t.admin.invNewPerson}` }]}
          />
        </div>
        {person === NEW_PERSON && (
          <div>
            <label htmlFor="prev-name" className={label}>
              {t.admin.fndName}
            </label>
            <Input id="prev-name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} />
          </div>
        )}
        <div>
          <label htmlFor="prev-kind" className={label}>
            {t.admin.invKind}
          </label>
          <Select id="prev-kind" style={BOX} value={kind} onChange={setKind} options={(["loan", "profit_share", "payback"] as const).map((k) => ({ value: k, label: kindLabel[k] }))} />
          <p className="m-0 mt-1 text-xs text-muted-foreground">{kindHint[kind]}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {kind === "profit_share" && (
            <div>
              <label htmlFor="prev-pct" className={label}>
                {t.admin.invPct}
              </label>
              <InputNumber id="prev-pct" min={0} max={100} precision={2} value={pct} onChange={(v) => setPct(v === null ? null : Number(v))} style={BOX} />
            </div>
          )}
          <div>
            <label htmlFor="prev-amount" className={label}>
              {t.admin.invAmount}
            </label>
            <InputNumber id="prev-amount" min={0} precision={2} value={amount} onChange={(v) => setAmount(v === null ? null : Number(v))} style={BOX} />
          </div>
          <div>
            <label htmlFor="prev-date" className={label}>
              {t.admin.invPrevDate}
            </label>
            <DatePicker id="prev-date" format="DD-MM-YYYY" value={date} onChange={(d) => d && setDate(d)} allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} style={BOX} />
          </div>
        </div>
        <div>
          <label htmlFor="prev-note" className={label}>
            {t.admin.mbkNote}
          </label>
          <Input id="prev-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </div>
      </div>
    </Modal>
  );
}
