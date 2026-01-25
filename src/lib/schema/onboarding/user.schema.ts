import { z } from "zod";
import { StoreStatus, USER_TYPES, Currency } from "@/lib/types/enums";

/* ----------------------------------
   Helpers
---------------------------------- */

// Safe File or URL (works in browser + server)
const fileOrUrl = z.union([
  z.any(), // File (browser)
  z.string().url("Invalid URL"),
]);

const requiredFileOrUrl = fileOrUrl.refine(
  (val) => {
    if (typeof val === "string") return val.trim().length > 0;
    return !!val;
  },
  { message: "This field is required" },
);

/* ----------------------------------
   User Profile Schema
---------------------------------- */

const userProfileSchema = z.object({
  avatar_url: z.string().url("Invalid URL").optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
});

/* ----------------------------------
   Store Schema
---------------------------------- */

const storeSchema = z.object({
  store_name: z.string().nonempty("Store name is required"),
  store_slug: z.string().nonempty("Store slug is required"),

  logo_url: requiredFileOrUrl,
  banner_url: fileOrUrl.optional(), // now optional

  description: z.string().optional(),

  status: z.nativeEnum(StoreStatus),

  contact_email: z.string().email("Invalid email address"),
  contact_phone: z.string().nonempty("Store phone number is required"),
  business_address: z.string().nonempty("Store address is required"),

  business_license: z.string().optional(),
  tax_id: z.string().optional(),
});

/* ----------------------------------
   Store Settings Schema
---------------------------------- */
/* ----------------------------------
   Store Social Media Schema (Fixed)
---------------------------------- */

// Helper: optional URL, allow empty string
const optionalUrl = z.string().url("Invalid URL").optional().or(z.literal("")); // allow empty string

export const storeSocialMediaSchema = z.object({
  facebook_link: optionalUrl,
  instagram_link: optionalUrl,
  youtube_link: optionalUrl,
  twitter_link: optionalUrl,
});

const storeSettingsSchema = z.object({
  currency: z.nativeEnum(Currency),

  tax_rate: z.number().min(0),

  shipping_fees: z
    .array(
      z.object({
        name: z.string().nonempty("Shipping method is required"),

        price: z.number().min(1, "Shipping fee must be greater than 0"),

        estimated_days: z
          .number()
          .int()
          .min(1, "Estimated days must be greater than 0"),
      }),
    )
    .min(1, { message: "At least one shipping method is required" }),
  free_shipping_threshold: z.number().min(0).optional(),
  min_order_amount: z.number().min(0),

  processing_time_days: z.number().int().min(0),
  return_policy_days: z.number().int().min(0),

  terms_and_conditions: z.string().optional(),
  privacy_policy: z.string().optional(),
  store_social_media: storeSocialMediaSchema.optional(),
});

/* ----------------------------------
   Create User Schema (BE payload only)
   REMOVED: password_confirmation and accept_terms
---------------------------------- */

export const createUserSchema = z.object({
  email: z.string().email("Invalid email").nonempty("Email is required"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain a special character"),

  first_name: z.string().nonempty("First name is required"),
  last_name: z.string().nonempty("Last name is required"),
  phone: z.string().nonempty("Phone number is required"),

  user_type: z.enum(Object.values(USER_TYPES) as [string, ...string[]]),

  profile: userProfileSchema.optional(),

  store: storeSchema,

  store_settings: storeSettingsSchema.optional(),

  is_active: z.boolean(),
});

/* ----------------------------------
   Types
---------------------------------- */

export type CreateUserType = z.infer<typeof createUserSchema>;
export type UserProfileType = z.infer<typeof userProfileSchema>;
export type StoreType = z.infer<typeof storeSchema>;
export type StoreSettingsType = z.infer<typeof storeSettingsSchema>;
