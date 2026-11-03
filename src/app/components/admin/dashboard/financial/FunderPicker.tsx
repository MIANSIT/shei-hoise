"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Select } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { createMoneyPartner, listMoneyPartners } from "@/lib/queries/financial/moneyPartners";
import {
  DEFAULT_TREATMENT,
  type FunderTreatment,
  type FunderValue,
  type MoneyPartner,
} from "@/lib/queries/financial/moneyPartnerTypes";

interface FunderPickerProps {
  /** Used by the form field wrapper. */
  value?: FunderValue;
  onChange?: (value: FunderValue) => void;
}

const FULL = { width: "100%" } as const;

/**
 * "Who paid, and how does it count?" for money that came from outside the shop.
 * Pick the owner or an investor, then say whether it is money they put into the
 * business (capital) or a loan the business must pay back. The owner can add
 * a person to the list from here.
 */
export function FunderPicker({ value, onChange }: FunderPickerProps) {
  const t = useTranslation();
  const { storeId } = useCurrentUser();
  const { isOwner } = usePermissions();
  const { error: showError } = useSheiNotification();
  const [partners, setPartners] = useState<MoneyPartner[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<MoneyPartner["kind"]>("investor");
  const [saving, setSaving] = useState(false);

  const current: FunderValue = value ?? { partnerId: null, treatment: "capital" };

  const load = useCallback(async () => {
    if (!storeId) return;
    setPartners(await listMoneyPartners(storeId));
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = (partnerId: string) => {
    const partner = partners.find((p) => p.id === partnerId);
    // The usual way each kind counts: an owner's own money is capital, an investor's is a loan.
    onChange?.({ partnerId, treatment: partner ? DEFAULT_TREATMENT[partner.kind] : current.treatment });
  };

  const add = async () => {
    if (!storeId) return;
    setSaving(true);
    try {
      const result = await createMoneyPartner(storeId, { name, kind });
      if (!result.success) return showError(result.error);
      setPartners((prev) => [...prev, result.partner].sort((a, b) => a.name.localeCompare(b.name)));
      onChange?.({ partnerId: result.partner.id, treatment: DEFAULT_TREATMENT[result.partner.kind] });
      setName("");
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  const label = "block text-xs font-semibold text-muted-foreground mb-1";

  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <div>
        <span className={label}>{t.admin.fndWho}</span>
        <Select
          style={FULL}
          placeholder={t.admin.fndWhoPh}
          value={current.partnerId ?? undefined}
          onChange={choose}
          options={partners.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.kind === "owner" ? t.admin.fndKindOwner : t.admin.fndKindInvestor})`,
          }))}
        />
        {isOwner && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="mt-1.5 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300">
            + {t.admin.fndAdd}
          </button>
        )}
      </div>

      {adding && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input placeholder={t.admin.fndName} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <Select
            value={kind}
            onChange={setKind}
            options={[
              { value: "owner", label: t.admin.fndKindOwner },
              { value: "investor", label: t.admin.fndKindInvestor },
            ]}
          />
          <div className="flex gap-2">
            <Button type="primary" loading={saving} disabled={!name.trim()} onClick={add}>
              {t.admin.fndAddSave}
            </Button>
            <Button onClick={() => setAdding(false)} disabled={saving}>
              {t.admin.spCancel}
            </Button>
          </div>
        </div>
      )}

      <div>
        <span className={label}>{t.admin.fndTreatment}</span>
        <Select
          style={FULL}
          value={current.treatment}
          onChange={(treatment: FunderTreatment) => onChange?.({ partnerId: current.partnerId, treatment })}
          options={[
            { value: "capital", label: t.admin.fndCapital },
            { value: "loan", label: t.admin.fndLoan },
          ]}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">{current.treatment === "capital" ? t.admin.fndHintCapital : t.admin.fndHintLoan}</p>
      </div>
    </div>
  );
}
