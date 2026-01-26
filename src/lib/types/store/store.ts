// /lib/types/store/store.ts

import { Currency } from "../enums";

// Store types
export interface StoreData {
  id: string;
  //   owner_id: string;
  store_name: string;
  store_slug: string;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  contact_email?: string;
  contact_phone?: string;
  business_address?: string | null;
  business_license?: string | null;
  tax_id?: string | null;
  status: string;
  approved_by?: string | null;
  approved_at?: Date | null;
  is_active: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export type UpdatedStoreData = Partial<StoreData>;

// Store settings types - UPDATED to match your database schema
export interface ShippingFee {
  name: string;
  price: number;
  description?: string;
  min_order_amount?: number;
  max_order_amount?: number;
  estimated_days?: number;
}

export type ShippingFees = ShippingFee[];

export interface StoreSettings {
  id: string;
  store_id: string;
  currency: Currency;
  tax_rate: number;
  free_shipping_threshold: number | null;
  min_order_amount: number;
  processing_time_days: number;
  return_policy_days: number;
  terms_and_conditions?: string | null;
  privacy_policy?: string | null;
  shipping_fees?: ShippingFees | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export type UpdatedStoreSettings = Partial<StoreSettings>;
export interface StoreSocialMedia {
  id: string;
  store_id: string;
  facebook_link?: string | null;
  instagram_link?: string | null;
  twitter_link?: string | null;
  youtube_link?: string | null;
  created_at?: Date | string;
}
export type UpdatedStoreSocialMedia = Partial<StoreSocialMedia>;
// Policy types
export type PolicyType = "terms" | "privacy";
export interface PolicyUpdate {
  type: PolicyType;
  content: string;
}
export { Currency };
