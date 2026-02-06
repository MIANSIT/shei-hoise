// lib/schema/checkoutSchema.ts - UPDATED FOR SIMPLE CHECKOUT
import { z } from "zod";

// ✅ UPDATED: Bangladesh phone number validation without +88
const bangladeshPhoneValidation = z
  .string()
  .regex(/^01[3-9]\d{8}$/, "Phone number must be in format: 01XXXXXXXXX")
  .min(11, "Phone number must be 11 digits")
  .max(11, "Phone number must be 11 digits");

// ✅ UPDATED: Email is now completely optional
const emailValidation = z
  .string()
  .email("Invalid email address")
  .optional()
  .or(z.literal(''))
  .refine((email) => {
    // If email is provided and not empty, validate format
    if (email && email.trim().length > 0) {
      return email.includes("@") && email.includes(".");
    }
    return true; // Email is optional, so empty is valid
  }, {
    message: "Email must contain @ and .com domain",
  });

// ✅ UPDATED: Password validation (optional)
const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    "Password must contain at least one special character"
  )
  .optional()
  .or(z.literal(''));

// ✅ UPDATED: For logged-in users, make password truly optional
const loggedInPasswordValidation = z.string().optional().or(z.literal(''));

// ✅ UPDATED: Schema for non-logged-in users (email & password optional)
export const customerCheckoutSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  phone: bangladeshPhoneValidation,
  email: emailValidation, // ✅ Now truly optional
  password: passwordValidation, // ✅ Optional
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  postCode: z.string().optional(), // ✅ Made optional for simplicity
  shippingAddress: z.string().min(1, "Shipping address is required"),
});

// ✅ UPDATED: Schema for logged-in users
export const customerCheckoutSchemaForLoggedIn = z.object({
  name: z.string().min(1, "Full name is required"),
  phone: bangladeshPhoneValidation,
  email: emailValidation, // ✅ Optional
  password: loggedInPasswordValidation, // ✅ Truly optional
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  postCode: z.string().optional(), // ✅ Made optional
  shippingAddress: z.string().min(1, "Shipping address is required"),
});

// ✅ UPDATED: Create simplified schema for display purposes
export const simplifiedCheckoutSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  phone: bangladeshPhoneValidation,
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  postCode: z.string().optional(),
  shippingAddress: z.string().min(1, "Shipping address is required"),
});

export const addToCartSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.string().nullable().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  storeSlug: z.string().min(1, "Store slug is required"),
});

// ✅ UPDATED: Make email and password optional in the type
export type CustomerCheckoutFormValues = {
  name: string;
  phone: string;
  email?: string; // ✅ Optional
  password?: string; // ✅ Optional
  country: string;
  city: string;
  postCode?: string; // ✅ Optional
  shippingAddress: string;
};

export type AddToCartType = z.infer<typeof addToCartSchema>;