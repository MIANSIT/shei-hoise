"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Select } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { getInvestorAvailable } from "@/lib/queries/financial/investorMoney";
import type { InvestorAvailable } from "@/lib/queries/financial/investorMoneyTypes";
import type { FunderValue } from "@/lib/queries/financial/moneyPartnerTypes";

interface FunderPickerProps {
  /** Used by the form field wrapper. */
  value?: FunderValue;
  onChange?: (value: FunderValue) => void;
  /** What is being paid, to warn when the person has less than that in the Investor account. */
  amount?: number | null;
}

const FULL = { width: "100%" } as const;

/**
 * "Whose Investor account money pays this?" Lists the people who put money in, with what each still has in the
 * Investor account. The money is taken from that person's balance, never from your sales. People and their money
 * are added on the Investor money page.
 */
export function FunderPicker({ value, onChange, amount }: FunderPickerProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const { storeId } = useCurrentUser();
  const { icon } = useUserCurrencyIcon();
  const symbol = typeof icon === "string" ? icon : "৳";
  const money = (v: number) => `${symbol}${n((Math.round(v * 100) / 100).toLocaleString())}`;
  const [people, setPeople] = useState<InvestorAvailable[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    getInvestorAvailable(storeId)
      .then((list) => {
        if (!cancelled) setPeople(list);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const label = "block text-xs font-semibold text-muted-foreground mb-1";
  const picked = people.find((p) => p.partner.id === value?.partnerId);
  const tooLow = picked && amount != null && amount > picked.available + 0.005;
  const withMoney = people.filter((p) => p.available > 0.005 || p.partner.id === value?.partnerId);

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <span className={label}>{t.admin.fndWho}</span>
      <Select
        style={FULL}
        placeholder={t.admin.fndWhoPh}
        value={value?.partnerId ?? undefined}
        // How the money counts is set on the Investor money page, so a payment from the account carries no choice here.
        onChange={(partnerId: string) => onChange?.({ partnerId, treatment: "capital" })}
        options={(withMoney.length > 0 ? withMoney : people).map((p) => ({
          value: p.partner.id,
          label: t.admin.invFunderOption.replace("{name}", p.partner.name).replace("{amount}", money(Math.max(p.available, 0))),
        }))}
      />
      {loaded && withMoney.length === 0 && (
        <p className="m-0 text-xs text-amber-700 dark:text-amber-300">
          {t.admin.invFunderNone}{" "}
          <Link href="/dashboard/financial/investor-money" className="font-semibold underline">
            {t.admin.invFunderOpen}
          </Link>
        </p>
      )}
      {tooLow && (
        <p role="alert" className="m-0 text-xs text-rose-600 dark:text-rose-400">
          {t.admin.invFunderLow.replace("{name}", picked.partner.name).replace("{amount}", money(Math.max(picked.available, 0)))}
        </p>
      )}
    </div>
  );
}
