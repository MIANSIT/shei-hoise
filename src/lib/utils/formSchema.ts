import { z } from "zod";

// Common validators
export const validators = {
  name: z.string().min(1, "Name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .regex(
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
      "Invalid email format"
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z
    .string()
    .min(8, "Confirm password must be at least 8 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  country: z.string().min(1, "Please select a country"),
  city: z.string().min(2, "City must be at least 2 characters"),
  shippingAddress: z
    .string()
    .min(5, "Shipping address must be at least 5 characters"),
  postCode: z.string().min(3, "Post code must be at least 3 characters"),
};

// Signup schema
export const signUpSchema = z.object({
  name: validators.name,
  email: validators.email,
  password: validators.password,
});

// Login schema
export const loginSchema = z.object({
  name: z.string().optional(),
  email: validators.email,
  password: validators.password,
});

// Checkout schema
export const userCheckoutSchema = z.object({
  name: validators.name,
  email: validators.email,
  phone: validators.phone,
  country: validators.country,
  city: validators.city,
  shippingAddress: validators.shippingAddress,
  postCode: validators.postCode,
});

// Profile update schema
export const profileSchema = z.object({
  name: validators.name,
  email: validators.email,
});
// Admin product schema
export const adminProductSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  currentPrice: z.string().min(1, "Current price is required"),
  originalPrice: z.string().min(1, "Original price is required"),
  discount: z.preprocess(
    (val) => Number(val),
    z.number().min(0, "Discount must be >= 0")
  ),
  stock: z.preprocess(
    (val) => Number(val),
    z.number().min(0, "Stock must be >= 0")
  ),
  images: z.array(z.any()).min(1, "At least one image is required"),
});

// Infer TypeScript types from schemas
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type CheckoutFormValues = z.infer<typeof userCheckoutSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type ProductFormValues = z.infer<typeof adminProductSchema>;
