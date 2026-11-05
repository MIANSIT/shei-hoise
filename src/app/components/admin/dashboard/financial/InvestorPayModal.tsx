"use client";

import { useEffect, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker, Input, InputNumber, Modal, Radio, Select } from "antd";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { payInvestorBack, payProfitShare } from "@/lib/queries/financial/investorMoney";
import { ratePctFor } from "@/lib/queries/financial/investorMath";
import { START_METHODS, type DealPosition, type PartnerPosition, type PayFrom, type StartMethod } from "@/lib/queries/financial/investorMoneyTypes";

const BOX = { width: "100%" } as const;

/** What the modal is paying: a loan or investment back, or one month's profit share. */
export type InvestorPayTarget =
  | { mode: "payback"; partner: PartnerPosition; deal: DealPosition }
  | { mode: "share"; partner: PartnerPosition; deal: DealPosition; month: string; due: number };

interface InvestorPayModalProps {
  storeId: string;
  target: InvestorPayTarget | null;
  money: (amount: number) => string;
  onClose: () => void;
  onDone: () => void;
}

/**
 * Pays an investor back (a loan repayment or an investment paid back) or pays a profit share. It asks which pocket
 * pays: business cash (the money your sales made) or the Investor account.
 */
export function InvestorPayModal({ storeId, target, money, onClose, onDone }: InvestorPayModalProps) {
  const t = useTranslation();
  const { success, error: showError } = useSheiNotification();
  const [amount, setAmount] = useState<number | null>(null);
  const [interest, setInterest] = useState<number | null>(null);
  const [payFrom, setPayFrom] = useState<PayFrom>("business");
  const [method, setMethod] = useState<StartMethod>("cash");
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setAmount(target.mode === "share" ? target.due : null);
    setInterest(null);
    setPayFrom("business");
    setMethod("cash");
    setDate(dayjs());
    setNote("");
  }, [target]);

  if (!target) return null;
  const { partner, deal } = target;
  const isLoan = deal.deal.kind === "loan";
  const methodLabel: Record<StartMethod, string> = {
    cash: t.admin.moCash,
    mobile_banking: t.admin.moMobileBanking,
    bank_transfer: t.admin.moBankTransfer,
  };
  const title =
    target.mode === "share"
      ? t.admin.invPayShareTitle.replace("{name}", partner.partner.name).replace("{month}", target.month)
      : (isLoan ? t.admin.invRepayTitle : t.admin.invPayBackTitle).replace("{name}", partner.partner.name);
  const left = deal.left;

  const save = async () => {
    if (amount === null || amount <= 0) return showError(t.admin.invNeedAmount);
    setSaving(true);
    try {
      const common = {
        dealId: deal.deal.id,
        amount,
        method,
        date: date.format("YYYY-MM-DD"),
        note: note || undefined,
      };
      const result =
        target.mode === "share"
          ? await payProfitShare(storeId, { ...common, payFrom, month: target.month })
          : await payInvestorBack(storeId, { ...common, ...(isLoan && interest ? { interestAmount: interest } : {}) });
      if (!result.success) return showError(result.error ?? t.admin.invFailed);
      success(t.admin.invSaved);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  const label = "block text-xs font-semibold text-muted-foreground mb-1";

  return (
    <Modal open onCancel={() => !saving && onClose()} onOk={save} okText={t.admin.invSave} cancelText={t.admin.spCancel} confirmLoading={saving} title={title} destroyOnHidden>
      <div className="space-y-3">
        {target.mode === "payback" && (
          <p className="m-0 text-xs text-muted-foreground">
            {(isLoan ? t.admin.invStillOwed : t.admin.invCapitalLeft).replace("{amount}", money(left))}
          </p>
        )}
        {target.mode === "share" && (
          <p className="m-0 text-xs text-muted-foreground">{t.admin.invShareHint.replace("{pct}", String(ratePctFor(deal.deal, target.month)))}</p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="inv-pay-amount" className={label}>
              {t.admin.invAmount}
            </label>
            <InputNumber id="inv-pay-amount" min={0} precision={2} value={amount} onChange={(v) => setAmount(v === null ? null : Number(v))} style={BOX} />
          </div>
          {target.mode === "payback" && isLoan && (
            <div>
              <label htmlFor="inv-pay-interest" className={label}>
                {t.admin.invInterest}
              </label>
              <InputNumber id="inv-pay-interest" min={0} precision={2} value={interest} onChange={(v) => setInterest(v === null ? null : Number(v))} style={BOX} />
            </div>
          )}
        </div>
        {target.mode === "payback" && isLoan && <p className="m-0 text-[11px] text-muted-foreground">{t.admin.invInterestHint}</p>}

        {target.mode === "share" ? (
          <div>
            <span className={label}>{t.admin.invPayFrom}</span>
            <Radio.Group value={payFrom} onChange={(e) => setPayFrom(e.target.value as PayFrom)} className="flex flex-col gap-1">
              <Radio value="business">{t.admin.invFromBusiness}</Radio>
              <Radio value="investor">
                {t.admin.invFromInvestor} · {t.admin.invAvailable.replace("{amount}", money(Math.max(partner.available, 0)))}
              </Radio>
            </Radio.Group>
          </div>
        ) : (
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {(() => {
              // The investor's own money goes back first: the Investor account, then business cash for the rest.
              const principal = Math.max((amount ?? 0) - (isLoan ? (interest ?? 0) : 0), 0);
              const fromAccount = Math.min(Math.max(partner.available, 0), principal);
              return t.admin.invSplitLine
                .replace("{account}", money(fromAccount))
                .replace("{business}", money(Math.max(principal - fromAccount, 0)))
                .replace("{name}", partner.partner.name);
            })()}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="inv-pay-method" className={label}>
              {t.admin.slMethod}
            </label>
            <Select id="inv-pay-method" style={BOX} value={method} onChange={setMethod} options={START_METHODS.map((m) => ({ value: m, label: methodLabel[m] }))} />
          </div>
          <div>
            <label htmlFor="inv-pay-date" className={label}>
              {t.admin.mbkDate}
            </label>
            <DatePicker id="inv-pay-date" format="DD-MM-YYYY" value={date} onChange={(d) => d && setDate(d)} allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} style={BOX} />
          </div>
        </div>
        <div>
          <label htmlFor="inv-pay-note" className={label}>
            {t.admin.mbkNote}
          </label>
          <Input id="inv-pay-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </div>
      </div>
    </Modal>
  );
}
