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
  ONLINE = "online",
  CARD = "card",
  BANK_TRANSFER = "bank_transfer",
  MOBILE_BANKING = "mobile_banking"
}

export type DeliveryOption = "pathao" | "courier" | "other" | "inside dhaka" | "outside dhaka" | string;