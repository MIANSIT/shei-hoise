// app/types/customer.ts
export interface StoreCustomer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status?: "active" | "inactive";
}