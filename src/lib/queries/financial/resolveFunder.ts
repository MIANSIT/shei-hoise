import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPartnerAvailable } from "./investorLedger";
import type { FunderTreatment } from "./moneyPartnerTypes";

/** A payment from the Investor account, to check against what that person still has in it. */
export interface FunderCheck {
  amount: number;
  /** An expense being edited, so it is not counted twice. */
  excludeExpenseId?: string | null;
  /** Supplier payments being replaced, so they are not counted twice. */
  excludeLedgerIds?: readonly string[];
  /** Amounts already taken from the same person's money by other parts of the same save. */
  alreadyTaken?: number;
}

const money = (value: number): string => (Math.round(value * 100) / 100).toLocaleString("en-BD");

/**
 * Checks the "pay from" choice that comes from the browser before it is saved. A payment from the
 * Investor account ("outside") must name an investor on this store's list, and when `check` is given the
 * person must still have that much in the Investor account. Server code only: it is deliberately not a
 * server action, so the browser cannot call it.
 * @returns the values to save (all null when it does not apply), or why it was refused
 */
export async function resolveFunder(
  storeId: string,
  paidFrom: string | null | undefined,
  funderId: string | null | undefined,
  treatment: FunderTreatment | null | undefined,
  check?: FunderCheck,
): Promise<{ ok: true; funderId: string | null; treatment: FunderTreatment | null } | { ok: false; error: string }> {
  if (paidFrom !== "outside") return { ok: true, funderId: null, treatment: null };
  // Nothing is being paid, so there is no account to take from.
  if (check && check.amount <= 0) return { ok: true, funderId: null, treatment: null };
  if (!funderId) return { ok: false, error: "Choose whose Investor account money was used" };
  const { data } = await supabaseAdmin
    .from("money_partners")
    .select("id")
    .eq("id", funderId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data) return { ok: false, error: "That person is not on the list" };

  if (check) {
    const held = await getPartnerAvailable(storeId, data.id, { expenseId: check.excludeExpenseId, ledgerIds: check.excludeLedgerIds });
    const left = (held?.available ?? 0) - (check.alreadyTaken ?? 0);
    if (check.amount > left + 0.005) {
      return {
        ok: false,
        error: `${held?.name ?? "This investor"} has ${money(Math.max(left, 0))} in the Investor account. Add investor money first, or pay from business cash.`,
      };
    }
  }
  // How the money counts is decided on the Investor money page now, so a payment from the account is saved as capital.
  return { ok: true, funderId: data.id, treatment: treatment === "loan" ? "loan" : "capital" };
}
