// lib/types/users.ts
import { z } from "zod";
import { CustomerProfile } from "./customer";

export enum USERTYPE {
  STORE_OWNER = "store_owner",
  CUSTOMER = "customer",
  SUPER_ADMIN = "super_admin",
}

export const customerProfileSchema = z.object({
  user_id: z.string().uuid(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().nullable(),
  store_id: z.string().uuid().nullable(),
  user_type: z.nativeEnum(USERTYPE),
});

export type CurrentUser = z.infer<typeof userSchema>;
// Remove the duplicate CustomerProfile type definition here
// export type CustomerProfile = z.infer<typeof customerProfileSchema>;

export interface TableCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status?: "active" | "inactive";
  order_count?: number;
  last_order_date?: string;
  source?: "direct" | "orders";
}
