// lib/schema/checkoutSchema.ts
import { z } from "zod";

// Strong password validation
const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    "Password must contain at least one special character"
  );

// Simple password validation for logged-in users (dummy validation)
const simplePasswordValidation = z.string().min(1, "Password is required");

// Bangladesh phone number validation
const bangladeshPhoneValidation = z
  .string()
  .regex(/^\+8801[3-9]\d{8}$/, "Phone number must be in format: +8801XXXXXXXXX")
  .min(11, "Phone number must be at least 11 characters");

// Email validation
const emailValidation = z
  .string()
  .email("Invalid email address")
  .refine((email) => email.includes("@") && email.includes("."), {
    message: "Email must contain @ and .com domain",
  });

// Schema for non-logged-in users (full validation)
export const customerCheckoutSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: emailValidation,
  phone: bangladeshPhoneValidation,
  password: passwordValidation,
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  postCode: z.string().min(1, "Postal code is required"),
  shippingAddress: z.string().min(1, "Shipping address is required"),
});

// Schema for logged-in users (password validation relaxed)
export const customerCheckoutSchemaForLoggedIn = z.object({
  name: z.string().min(1, "Full name is required"),
  email: emailValidation,
  phone: bangladeshPhoneValidation,
  password: simplePasswordValidation, // ✅ FIX: Simple validation for logged-in users
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  postCode: z.string().min(1, "Postal code is required"),
  shippingAddress: z.string().min(1, "Shipping address is required"),
});

export const addToCartSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.string().nullable().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  storeSlug: z.string().min(1, "Store slug is required"),
});

export type CustomerCheckoutFormValues = z.infer<typeof customerCheckoutSchema>;
export type AddToCartType = z.infer<typeof addToCartSchema>;