// lib/types/enums.ts
export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled"
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded"
}

export enum PaymentMethod {
  COD = "cod",
  CASH = "cash",
  ONLINE = "online"
}

export type DeliveryOption = "pathao" | "courier" | "other" | "inside dhaka" | "outside dhaka" | string;