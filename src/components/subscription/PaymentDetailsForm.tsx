"use client";

import { Input } from "antd";
import { useTranslation } from "@/lib/hook/useTranslation";

export function PaymentDetailsForm({
  reference,
  onReferenceChange,
  senderNumber,
  onSenderNumberChange,
  notes,
  onNotesChange,
}: {
  reference: string;
  onReferenceChange: (value: string) => void;
  senderNumber: string;
  onSenderNumberChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
}) {
  const t = useTranslation();
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
        {t.admin.subConfirmYourPayment}
      </p>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          {t.admin.subFieldTxnRef} <span className="text-red-400">*</span>
        </label>
        <Input
          value={reference}
          onChange={(e) => onReferenceChange(e.target.value)}
          placeholder={t.admin.subTxnRefPlaceholder}
          size="large"
          className="font-mono"
        />
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          {t.admin.subTxnRefHint}
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          {t.admin.subFieldSenderNumber} <span className="text-red-400">*</span>
        </label>
        <Input
          value={senderNumber}
          onChange={(e) => onSenderNumberChange(e.target.value)}
          placeholder={t.admin.subSenderPlaceholder}
          className="font-mono"
        />
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          {t.admin.subSenderHint}
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          {t.admin.subFieldNotes} <span className="text-gray-300 dark:text-gray-600 font-normal">{t.admin.subOptional}</span>
        </label>
        <Input.TextArea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={t.admin.subNotesPlaceholder}
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  );
}
