import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const selectPlanSchema = z.object({
  plan_id: z.string().uuid(),
  billing_cycle: z.enum(["monthly", "yearly"]),
  invoice_number: z.string().min(1),
  payment: z.object({
    method: z.enum(["bkash", "nagad", "bank"]),
    reference: z.string().min(1, "Reference is required"),
    sender_number: z.string().min(1, "Sender number is required"),
    notes: z.string().optional(),
  }),
});

function computePeriodEnd(start: Date, billingCycle: "monthly" | "yearly"): Date {
  const end = new Date(start);
  if (billingCycle === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { plan_id, billing_cycle, invoice_number, payment } = selectPlanSchema.parse(body);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: dbUser } = await supabase
      .from("users")
      .select("store_id, user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (dbUser?.user_type === "super_admin") {
      return Response.json({ error: "Admins cannot subscribe to a plan" }, { status: 403 });
    }

    const storeId = dbUser?.store_id;
    if (!storeId) {
      return Response.json({ error: "No store found for this account" }, { status: 400 });
    }

    // Existing subscription (if any) — used both to detect a plan switch and to reuse its id
    const { data: existingSub } = await supabaseAdmin
      .from("store_subscriptions")
      .select("id, plan_id")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Block duplicate pending payments on the same subscription
    if (existingSub) {
      const { data: pendingInvoice } = await supabaseAdmin
        .from("subscription_invoices")
        .select("id, invoice_number")
        .eq("subscription_id", existingSub.id)
        .in("status", ["unpaid", "submitted"])
        .maybeSingle();

      if (pendingInvoice) {
        return Response.json(
          {
            error: `You already have a pending payment (${pendingInvoice.invoice_number}). Complete or wait for review before selecting another plan.`,
            invoiceId: pendingInvoice.id,
          },
          { status: 409 },
        );
      }
    }

    // Load the plan — must be active, and public unless it's the store's current plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("id, name, price_monthly, price_yearly, currency, is_public, is_active")
      .eq("id", plan_id)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    if (!plan.is_public && plan.id !== existingSub?.plan_id) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    const amount = billing_cycle === "yearly" ? plan.price_yearly : plan.price_monthly;
    if (billing_cycle === "yearly" && !(amount > 0)) {
      return Response.json({ error: "Yearly billing is not available for this plan" }, { status: 400 });
    }

    const now = new Date();
    const periodEnd = computePeriodEnd(now, billing_cycle);

    let subscriptionId = existingSub?.id ?? null;

    // No subscription yet — create one now (status stays incomplete until the invoice is paid)
    if (!subscriptionId) {
      const { data: newSub, error: subError } = await supabaseAdmin
        .from("store_subscriptions")
        .insert({
          store_id: storeId,
          user_id: user.id,
          plan_id: plan.id,
          status: "incomplete",
          billing_cycle,
        })
        .select("id")
        .single();

      if (subError || !newSub) {
        return Response.json({ error: subError?.message ?? "Failed to create subscription" }, { status: 400 });
      }
      subscriptionId = newSub.id;
    }

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("subscription_invoices")
      .insert({
        invoice_number,
        subscription_id: subscriptionId,
        store_id: storeId,
        user_id: user.id,
        plan_id: plan.id,
        plan_name: plan.name,
        amount,
        currency: plan.currency,
        billing_cycle,
        status: "submitted",
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
        due_date: now.toISOString(),
        payment_method: payment.method,
        payment_reference: payment.reference,
        sender_number: payment.sender_number,
        notes: payment.notes ?? null,
      })
      .select("id, invoice_number")
      .single();

    if (invoiceError || !invoice) {
      return Response.json({ error: invoiceError?.message ?? "Failed to create invoice" }, { status: 400 });
    }

    return Response.json(
      { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
