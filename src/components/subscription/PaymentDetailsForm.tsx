"use client";

import { Input } from "antd";

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
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
        Confirm Your Payment
      </p>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          Transaction ID / Reference <span className="text-red-400">*</span>
        </label>
        <Input
          value={reference}
          onChange={(e) => onReferenceChange(e.target.value)}
          placeholder="e.g. 8N7A6B2XQP"
          size="large"
          className="font-mono"
        />
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          The transaction ID from your payment receipt.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          Sender Number <span className="text-red-400">*</span>
        </label>
        <Input
          value={senderNumber}
          onChange={(e) => onSenderNumberChange(e.target.value)}
          placeholder="Phone / account number you paid from"
          className="font-mono"
        />
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          The bKash / Nagad / bank account number you sent from.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          Notes <span className="text-gray-300 dark:text-gray-600 font-normal">(optional)</span>
        </label>
        <Input.TextArea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any other details about the payment..."
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  );
}
