// lib/actions/users/createUserCore.ts
"use server";

import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function createUserCore(payload: CreateUserType) {
  // 1️⃣ Auth user
  const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
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

  const userId = data.user.id;

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

  // 3️⃣ Profile
  if (payload.profile) {
    const { error } = await supabase.from("user_profiles").insert({
      user_id: userId,
      ...payload.profile,
    });

    if (error) throw error;
  }

  return userId;
}
