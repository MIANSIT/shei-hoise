import { z } from "zod";

export const LoginFormSchema = z.object({
  username: z.string().email({ message: "Must be a valid email address" }),

  password: z
    .string()
    .regex(/.*[A-Z].*/, { message: "One uppercase character required" }),
});

export type LoginFormType = z.infer<typeof LoginFormSchema>;

export const RequestPasswordResetSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  type: z.enum(["admin", "user"]),
  storeSlug: z.string().optional(),
});

export type RequestPasswordResetType = z.infer<typeof RequestPasswordResetSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type ResetPasswordType = z.infer<typeof ResetPasswordSchema>;
