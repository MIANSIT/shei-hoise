// lib/actions/users/createUser.ts
"use server";

import {
  createUserSchema,
  CreateUserType,
} from "@/lib/schema/onboarding/user.schema";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createUserCore } from "@/lib/queries/onboarding/store/createUserCore";
import { createStoreWithSettings } from "@/lib/queries/onboarding/store/createStoreWithSettings";
import { DomainErrorCode } from "@/lib/errors/domainErrors";
// ✅ Domain error codes for production

async function assignDefaultTrialPlan(storeId: string, userId: string): Promise<void> {
  try {
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("id, trial_days")
      .eq("is_default_trial_plan", true)
      .eq("is_active", true)
      .maybeSingle();

    if (!plan) return;

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + (plan.trial_days || 0));

    await supabaseAdmin.from("store_subscriptions").insert({
      store_id: storeId,
      user_id: userId,
      plan_id: plan.id,
      status: "trialing",
      trial_ends_at: trialEndsAt.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: trialEndsAt.toISOString(),
    });
  } catch (err) {
    console.error("assignDefaultTrialPlan failed (non-fatal):", err);
  }
}

export async function createUser(data: CreateUserType) {
  const payload = createUserSchema.parse(data);

  let userId: string | null = null;
  let storeId: string | null = null;

  try {
    // 1️⃣ Create user + profile
    userId = await createUserCore(payload);

    // 2️⃣ Create store + settings + social media
    if (payload.user_type === "store_owner") {
      storeId = await createStoreWithSettings({
        ownerId: userId,
        store: payload.store,
        settings: payload.store_settings,
      });

      // 3️⃣ Link user → store
      const { error: linkError } = await supabaseAdmin
        .from("users")
        .update({ store_id: storeId })
        .eq("id", userId);

      if (linkError) throw linkError;

      // 4️⃣ Auto-enroll into the default free trial plan, if one is configured.
      // Best-effort only — a store with no subscription row is treated as
      // unrestricted access everywhere else in the app, so a failure here
      // should never fail the whole signup.
      await assignDefaultTrialPlan(storeId!, userId!);
    }

    return { success: true, userId, storeId };
  } catch (err: unknown) {
    console.error("createUser failed:", err);

    // 🔄 ROLLBACK: Delete everything in correct order
    try {
      if (storeId) {
        await supabaseAdmin
          .from("store_social_media")
          .delete()
          .eq("store_id", storeId);

        await supabaseAdmin.from("store_settings").delete().eq("store_id", storeId);

        await supabaseAdmin.from("stores").delete().eq("id", storeId);
      }

      if (userId) {
        // delete from DB
        await supabaseAdmin.from("users").delete().eq("id", userId);

        // delete from Auth safely
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        } catch (authErr) {
          console.error("Failed to delete Supabase Auth user:", authErr);
          // ✅ do not throw — we want rollback to continue
        }
      }
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }

    // ✅ DOMAIN ERROR NORMALIZATION
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "email_exists"
    ) {
      throw new Error(DomainErrorCode.EMAIL_EXISTS);
    }

    throw new Error(DomainErrorCode.CREATE_USER_FAILED);
  }
}
