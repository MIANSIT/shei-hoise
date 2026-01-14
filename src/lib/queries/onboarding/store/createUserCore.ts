// lib/actions/users/createUserCore.ts
"use server";

import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function createUserCore(payload: CreateUserType) {
  let userId: string | null = null;

  try {
    // 1️⃣ Auth user
    const { data, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          first_name: payload.first_name,
          last_name: payload.last_name,
          user_type: payload.user_type,
        },
      });

    if (authError) throw authError;

    userId = data.user.id;

    // 2️⃣ Users table
    const { error: userError } = await supabase.from("users").insert({
      id: userId,
      email: payload.email,
      password_hash: "AUTH_MANAGED",
      first_name: payload.first_name,
      last_name: payload.last_name,
      phone: payload.phone || null,
      user_type: payload.user_type,
      email_verified: true,
      is_active: true,
    });

    if (userError) throw userError;

    // 3️⃣ User profile (optional)
    if (payload.profile) {
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: userId,
          ...payload.profile,
        });

      if (profileError) throw profileError;
    }

    return userId;
  } catch (err) {
    console.error("createUserCore failed:", err);

    // 🔄 FULL rollback
    if (userId) {
      await supabase.from("users").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }

    throw err;
  }
}
