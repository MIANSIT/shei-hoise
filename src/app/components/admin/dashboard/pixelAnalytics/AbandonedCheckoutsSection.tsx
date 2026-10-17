"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Phone, PhoneCall } from "lucide-react";
import { getCheckoutLeads } from "@/lib/queries/checkoutLeads/getCheckoutLeads";
import type { CheckoutLead } from "@/lib/types/checkoutLead";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface AbandonedCheckoutsSectionProps {
  storeId: string;
  /** Length of the dashboard's selected period. */
  days: number;
}

const INITIAL_ROWS = 10;
const ITEM_PREVIEW = 2;

/** 01712345678 → 8801712345678, the form wa.me links need. */
function whatsappNumber(localPhone: string): string {
  return `88${localPhone}`;
}

export function AbandonedCheckoutsSection({ storeId, days }: AbandonedCheckoutsSectionProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const { icon: currencyIcon } = useUserCurrencyIcon();

  const [leads, setLeads] = useState<CheckoutLead[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLeads(null);
    getCheckoutLeads(storeId, days)
      .then((rows) => {
        if (!cancelled) setLeads(rows);
      })
      .catch(() => {
        if (!cancelled) setLeads([]);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, days]);

  if (leads === null) return null;

  const symbol = typeof currencyIcon === "string" ? currencyIcon : "৳";
  const money = (value: number) => `${symbol} ${n(Math.round(value).toLocaleString("en-US"))}`;
  const potential = leads.reduce((sum, l) => sum + l.cartValue, 0);
  const visible = showAll ? leads : leads.slice(0, INITIAL_ROWS);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
          <PhoneCall className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-sm font-bold text-foreground">{t.admin.abandonedTitle}</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4 max-w-2xl leading-relaxed">{t.admin.abandonedSubtitle}</p>

      {leads.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t.admin.abandonedEmpty}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
              <p className="text-lg font-black text-amber-700 dark:text-amber-400 tabular-nums">{n(leads.length)}</p>
              <p className="text-[11px] font-semibold text-muted-foreground">{t.admin.abandonedCount}</p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
              <p className="text-lg font-black text-amber-700 dark:text-amber-400 tabular-nums">{money(potential)}</p>
              <p className="text-[11px] font-semibold text-muted-foreground">{t.admin.abandonedValue}</p>
            </div>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-xs min-w-160">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-muted-foreground pb-2 pr-4">{t.admin.abandonedCustomerCol}</th>
                  <th className="text-left font-semibold text-muted-foreground pb-2 px-2">{t.admin.abandonedCartCol}</th>
                  <th className="text-right font-semibold text-muted-foreground pb-2 px-2">{t.admin.abandonedValueCol}</th>
                  <th className="text-right font-semibold text-muted-foreground pb-2 px-2 whitespace-nowrap">{t.admin.abandonedWhenCol}</th>
                  <th className="pb-2 pl-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {visible.map((lead) => {
                  const extra = lead.items.length - ITEM_PREVIEW;
                  return (
                    <tr key={lead.id} className="align-top">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-foreground">{lead.customerName ?? t.admin.abandonedNoName}</p>
                        <p className="text-muted-foreground tabular-nums">{n(lead.phone)}</p>
                        {lead.city && <p className="text-muted-foreground">{lead.city}</p>}
                      </td>
                      <td className="py-2.5 px-2 text-foreground max-w-64">
                        {lead.items.slice(0, ITEM_PREVIEW).map((item, i) => (
                          <p key={i} className="truncate">
                            {n(item.quantity)} × {item.name}
                          </p>
                        ))}
                        {extra > 0 && (
                          <p className="text-muted-foreground">
                            +{n(extra)} {t.admin.abandonedMoreItems}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-foreground">{money(lead.cartValue)}</td>
                      <td className="py-2.5 px-2 text-right text-muted-foreground whitespace-nowrap">
                        {n(new Date(lead.updatedAt).toLocaleString())}
                      </td>
                      <td className="py-2.5 pl-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {t.admin.abandonedCall}
                          </a>
                          <a
                            href={`https://wa.me/${whatsappNumber(lead.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-1.5 font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {t.admin.abandonedWhatsApp}
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {leads.length > INITIAL_ROWS && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {showAll ? t.admin.abandonedShowLess : `${t.admin.abandonedShowAll} (${n(leads.length)})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
