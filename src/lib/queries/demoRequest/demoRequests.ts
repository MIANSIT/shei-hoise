// lib/queries/demoRequests.ts
import { supabase } from "@/lib/supabase";

export interface DemoRequestPayload {
  full_name: string;
  email: string;
  company_name: string;
  message: string;
}

export async function createDemoRequest(payload: DemoRequestPayload) {
  const { data, error } = await supabase
    .from("demo_requests")
    .insert([payload])
    .select(); // optional: return inserted row

  if (error) {
    throw error;
  }
  return data;
}
