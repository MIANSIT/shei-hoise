// lib/queries/ContactUS.ts
import { supabase } from "@/lib/supabase";

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
