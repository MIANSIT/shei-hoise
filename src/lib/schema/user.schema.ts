import { z } from "zod";

// Profile schema
const userProfileSchema = z.object({
  avatar_url: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string(),
});

// Store schema
const storeSchema = z.object({
  store_name: z.string(),
  store_slug: z.string(),
  description: z.string().optional(),
  logo_url: z.string().optional(),
  banner_url: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  business_address: z.string().optional(),
  business_license: z.string().optional(),
  tax_id: z.string().optional(),
});

// Store settings schema
const storeSettingsSchema = z.object({
  currency: z.string(),
  tax_rate: z.number(),
  shipping_fee: z.number(),
  free_shipping_threshold: z.number().optional(),
  min_order_amount: z.number(),
  processing_time_days: z.number(),
  return_policy_days: z.number(),
  terms_and_conditions: z.string().optional(),
  privacy_policy: z.string().optional(),
});

// Main user schema
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().optional(),
  user_type: z.enum(["super_admin", "store_owner", "customer"]),
  profile: userProfileSchema.optional(),
  store: storeSchema.optional(),
  store_settings: storeSettingsSchema.optional(),
  is_active: z.boolean(),
});

// 🔹 Types
export type CreateUserType = z.infer<typeof createUserSchema>; // parsed output (with defaults)
