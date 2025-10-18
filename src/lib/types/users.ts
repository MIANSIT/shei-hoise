import z from "zod";

export enum USERTYPE {
  STORE_OWNER = "store_owner",
  CUSTOMER = "customer",
}
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string(),
  phone: z.string().nullable(),
  store_id: z.string().uuid().nullable(),
  user_type: z.enum(USERTYPE),
});

export type CurrentUser = z.infer<typeof userSchema>;
