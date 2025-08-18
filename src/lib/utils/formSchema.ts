
import { z } from "zod";

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
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
};

// Signup schema
export const signUpSchema = z
  .object({
    name: validators.name,
    email: validators.email,
    password: validators.password,
    
  })


// Login schema
export const loginSchema = z.object({
  email: validators.email,
  password: validators.password,
});

// Profile update schema (example)
export const profileSchema = z.object({
  name: validators.name,
  email: validators.email,
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;