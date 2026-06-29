import { supabase } from "@/lib/supabase";

export interface SubscriptionPlanInfo {
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
}

export interface StoreSubscription {
  id: string;
  store_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  started_at: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  cancels_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  payment_provider: string | null;
  created_at: string;
  plan: SubscriptionPlanInfo | null;
}

export interface SubscriptionInvoice {
  id: string;
  invoice_number: string;
  plan_name: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
}

export async function getStoreSubscription(
  storeId: string,
): Promise<StoreSubscription | null> {
  const { data, error } = await supabase
    .from("store_subscriptions")
    .select(
      `id, store_id, plan_id, status, billing_cycle,
       started_at, expires_at, trial_ends_at, canceled_at,
       cancels_at_period_end, current_period_start, current_period_end,
       payment_provider, created_at,
       subscription_plans (name, slug, description, price_monthly, price_yearly, currency)`,
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const raw = data as Record<string, unknown>;
  return {
    id: raw.id as string,
    store_id: raw.store_id as string,
    plan_id: raw.plan_id as string,
    status: raw.status as string,
    billing_cycle: raw.billing_cycle as string,
    started_at: raw.started_at as string | null,
    expires_at: raw.expires_at as string | null,
    trial_ends_at: raw.trial_ends_at as string | null,
    canceled_at: raw.canceled_at as string | null,
    cancels_at_period_end: raw.cancels_at_period_end as boolean,
    current_period_start: raw.current_period_start as string | null,
    current_period_end: raw.current_period_end as string | null,
    payment_provider: raw.payment_provider as string | null,
    created_at: raw.created_at as string,
    plan: (raw.subscription_plans as SubscriptionPlanInfo) ?? null,
  };
}

export async function getStoreInvoices(
  storeId: string,
): Promise<SubscriptionInvoice[]> {
  const { data, error } = await supabase
    .from("subscription_invoices")
    .select(
      `id, invoice_number, plan_name, amount, currency,
       billing_cycle, status, period_start, period_end,
       due_date, paid_at, payment_method, payment_reference, notes, created_at`,
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as SubscriptionInvoice[];
}
