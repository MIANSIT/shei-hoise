import { z } from "zod";

export const LoginFormSchema = z.object({
  username: z.string().email({ message: "Must be a valid email address" }),

  password: z
    .string()
    .regex(/.*[A-Z].*/, { message: "One uppercase character required" }),
});

export type LoginFormType = z.infer<typeof LoginFormSchema>;
