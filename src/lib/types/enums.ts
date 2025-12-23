// lib/types/enums.ts
export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum PaymentMethod {
  COD = "cod",
  CASH = "cash",
  ONLINE = "online",
  CARD = "card",
  BANK_TRANSFER = "bank_transfer",
  MOBILE_BANKING = "mobile_banking",
}

export enum DeliveryOption {
  PATHAO = "pathao",
  COURIER = "courier",
  OTHER = "other",
  INSIDE_DHAKA = "inside dhaka",
  OUTSIDE_DHAKA = "outside dhaka",
}
export enum StockFilter {
  ALL = "all",
  LOW = "low",
  IN = "in",
  OUT = "out",
}

export enum ProductStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DRAFT = "draft",
}
export enum StoreStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  TRAIL = "trail",
}
