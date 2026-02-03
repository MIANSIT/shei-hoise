// lib/actions/users/createUser.ts
"use server";

import {
  createUserSchema,
  CreateUserType,
} from "@/lib/schema/onboarding/user.schema";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { createUserCore } from "@/lib/queries/onboarding/store/createUserCore";
import { createStoreWithSettings } from "@/lib/queries/onboarding/store/createStoreWithSettings";
import { DomainErrorCode } from "@/lib/errors/domainErrors";
// ✅ Domain error codes for production

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
  } catch (err: unknown) {
    console.error("createUser failed:", err);

    // 🔄 ROLLBACK: Delete everything in correct order
    try {
      if (storeId) {
        await supabase
          .from("store_social_media")
          .delete()
          .eq("store_id", storeId);

        await supabase.from("store_settings").delete().eq("store_id", storeId);

        await supabase.from("stores").delete().eq("id", storeId);
      }

      if (userId) {
        // delete from DB
        await supabase.from("users").delete().eq("id", userId);

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
