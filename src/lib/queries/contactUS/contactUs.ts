// lib/queries/ContactUS.ts
"use server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export interface ContactUSPayload {
  full_name: string;
  email: string;
  company_name: string;
  phone_number: string; // <-- ADD THIS LINE
  message: string;
  source: string;
}

export async function createContactUS(payload: ContactUSPayload) {
  const { data, error } = await supabase
    .from("contact_us")
    .insert([payload])
    .select(); // optional: return inserted row

  if (error) {
    throw error;
  }
  return data;
}
