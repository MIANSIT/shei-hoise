// lib/actions/users/createUser.ts
"use server";

import {
  createUserSchema,
  CreateUserType,
} from "@/lib/schema/onboarding/user.schema";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { createUserCore } from "@/lib/queries/onboarding/store/createUserCore";
import { createStoreWithSettings } from "@/lib/queries/onboarding/store/createStoreWithSettings";

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
      const { error: linkError } = await supabase
        .from("users")
        .update({ store_id: storeId })
        .eq("id", userId);

      if (linkError) throw linkError;
    }

    return { success: true, userId, storeId };
  } catch (err) {
    console.error("createUser failed:", err);

    // 🔄 ROLLBACK: Delete everything in correct order
    try {
      if (storeId) {
        // Delete social media first
        await supabase
          .from("store_social_media")
          .delete()
          .eq("store_id", storeId);

        // Delete store settings
        await supabase.from("store_settings").delete().eq("store_id", storeId);

        // Delete store
        await supabase.from("stores").delete().eq("id", storeId);
      }

      if (userId) {
        // Delete user (cascades user_profile)
        await supabase.from("users").delete().eq("id", userId);

        // Delete Supabase auth user
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }

    throw err;
  }
}
