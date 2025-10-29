import { createAdminClient, createNormalClient } from "./client";

export const supabase = createNormalClient();
export const supabaseAdmin = createAdminClient();
