import { supabase } from "@/lib/supabase";

export interface AdminInvoiceRow {
  id: string;
  invoice_number: string;
  plan_name: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  sender_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  store_id: string;
  store_name: string | null;
  store_slug: string | null;
}

export async function getAdminPendingInvoices(): Promise<AdminInvoiceRow[]> {
  const { data, error } = await supabase
    .from("subscription_invoices")
    .select(
      `id, invoice_number, plan_name, amount, currency, billing_cycle,
       status, due_date, paid_at, payment_method, payment_reference,
       sender_number, notes, created_at, updated_at, store_id,
       stores (store_name, store_slug)`,
    )
    .not("payment_reference", "is", null)
    .not("status", "in", '("paid","cancelled","refunded")')
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const r = row as Record<string, unknown>;
    const store = r.stores as { store_name: string | null; store_slug: string | null } | null;
    return {
      id: r.id as string,
      invoice_number: r.invoice_number as string,
      plan_name: r.plan_name as string,
      amount: r.amount as number,
      currency: r.currency as string,
      billing_cycle: r.billing_cycle as string,
      status: r.status as string,
      due_date: r.due_date as string | null,
      paid_at: r.paid_at as string | null,
      payment_method: r.payment_method as string | null,
      payment_reference: r.payment_reference as string | null,
      sender_number: r.sender_number as string | null,
      notes: r.notes as string | null,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      store_id: r.store_id as string,
      store_name: store?.store_name ?? null,
      store_slug: store?.store_slug ?? null,
    };
  });
}
