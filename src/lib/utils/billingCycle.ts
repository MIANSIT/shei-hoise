/** Billing cycles a store can pick itself. "custom" is arranged by the super admin and never self-selected. */
export type PlanBillingCycle = "monthly" | "half_yearly" | "yearly";

export const PLAN_BILLING_CYCLES: readonly PlanBillingCycle[] = ["monthly", "half_yearly", "yearly"];

/** Months covered by one payment on each cycle. */
export const CYCLE_MONTHS: Readonly<Record<PlanBillingCycle, number>> = {
  monthly: 1,
  half_yearly: 6,
  yearly: 12,
};

interface PlanPrices {
  price_monthly: number;
  price_half_yearly?: number | null;
  price_yearly: number;
}

/**
 * Type guard for a billing cycle a store can self-select.
 * @returns true when `value` is monthly, half_yearly or yearly
 */
export function isPlanBillingCycle(value: string | null | undefined): value is PlanBillingCycle {
  return value === "monthly" || value === "half_yearly" || value === "yearly";
}

/**
 * Price of one payment on the given cycle. A cycle with no price set (0) means
 * the plan doesn't offer it.
 * @returns the amount to charge, 0 when the cycle isn't offered
 */
export function planPriceForCycle(plan: PlanPrices, cycle: PlanBillingCycle): number {
  const price =
    cycle === "yearly"
      ? plan.price_yearly
      : cycle === "half_yearly"
        ? plan.price_half_yearly
        : plan.price_monthly;
  return Number(price ?? 0);
}

/**
 * End of the billing period that starts at `start`.
 * @returns a new Date `CYCLE_MONTHS[cycle]` months after `start`
 */
export function computePeriodEnd(start: Date, cycle: PlanBillingCycle): Date {
  const end = new Date(start);
  if (cycle === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + CYCLE_MONTHS[cycle]);
  }
  return end;
}

/** Plain-English cycle name for emails and PDFs (the UI uses translations instead). */
export function billingCycleLabel(cycle: string): string {
  switch (cycle) {
    case "half_yearly":
      return "Half-yearly (6 months)";
    case "yearly":
      return "Yearly";
    case "monthly":
      return "Monthly";
    default:
      return cycle.charAt(0).toUpperCase() + cycle.slice(1);
  }
}
