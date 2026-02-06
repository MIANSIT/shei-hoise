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
  TRIAL = "trial",
}

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  [StoreStatus.PENDING]: "PENDING",
  [StoreStatus.APPROVED]: "APPROVED",
  [StoreStatus.REJECTED]: "REJECTED",
  [StoreStatus.TRIAL]: "TRIAL", // display label
};

export enum Currency {
  BDT = "BDT",
  // USD = "USD",
  // EUR = "EUR",
  // GBP = "GBP",
  // INR = "INR",
}

export const CURRENCY_ICONS: Record<Currency, string> = {
  [Currency.BDT]: "৳",  // Bengali Taka symbol
  // [Currency.USD]: "$",   // US Dollar
  // [Currency.EUR]: "€",   // Euro
  // [Currency.GBP]: "£",   // British Pound
  // [Currency.INR]: "₹",   // Indian Rupee
};

export const CURRENCY_NAMES: Record<Currency, string> = {
  [Currency.BDT]: "Taka",
  // [Currency.USD]: "US Dollar",
  // [Currency.EUR]: "Euro",
  // [Currency.GBP]: "British Pound",
  // [Currency.INR]: "Indian Rupee",
};
export const USER_TYPES = {
  //   SUPER_ADMIN: "super_admin",
  STORE_OWNER: "store_owner",
  //   CUSTOMER: "customer",
} as const;

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];

export const USER_TYPE_LABELS: Record<UserType, string> = {
  //   super_admin: "Super Admin",
  store_owner: "Store Owner",
  //   customer: "Customer",
};
