/** The owner or an investor: someone who can pay for the business out of their own pocket. */
export interface MoneyPartner {
  id: string;
  name: string;
  kind: "owner" | "investor";
}

/**
 * How money paid by a partner counts:
 *  - capital: they put it in; it stays theirs in the business
 *  - loan: the business owes it back to them
 */
export type FunderTreatment = "capital" | "loan";

export interface FunderValue {
  partnerId: string | null;
  treatment: FunderTreatment;
}

export interface CreatePartnerInput {
  name: string;
  kind: "owner" | "investor";
}

export type CreatePartnerResult = { success: true; partner: MoneyPartner } | { success: false; error: string };

/** What the business holds for one partner. */
export interface PartnerSummary {
  partner: MoneyPartner;
  /** Put in as their own money: bills and costs they paid, and money they added. */
  capital: number;
  /** What the business still owes them back. */
  owed: number;
}

/** The default way each kind of partner's money counts. */
export const DEFAULT_TREATMENT: Record<MoneyPartner["kind"], FunderTreatment> = {
  owner: "capital",
  investor: "loan",
};
