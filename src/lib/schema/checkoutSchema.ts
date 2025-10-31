// lib/utils/checkoutSchema.ts
import { z } from "zod";

export const customerCheckoutSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  postCode: z.string().min(1, "Postal code is required"),
  shippingAddress: z.string().min(1, "Shipping address is required"),
});

export type CustomerCheckoutFormValues = z.infer<typeof customerCheckoutSchema>;