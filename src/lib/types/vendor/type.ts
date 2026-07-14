// types/vendor/type.ts
// Vendor Distribution & Vendor Order module.
//
// "Warehouse stock" throughout this feature refers to the existing
// product_inventory.quantity_available — there is no separate warehouse
// table in this app. Vendor stock is a second, independently tracked pool
// (see vendor_stock) that only moves via vendor order confirmation and
// vendor settlements.

export type VendorStatus = "active" | "inactive";
export type VendorOrderStatus = "draft" | "confirmed" | "cancelled";

export interface Vendor {
  id: string;
  store_id: string;
  name: string;
  phone: string;
  address?: string | null;
  business_name?: string | null;
  notes?: string | null;
  status: VendorStatus;
  credit_limit: number;
  created_at: string;
  updated_at: string;
}

export interface VendorFormValues {
  name: string;
  phone: string;
  address?: string;
  business_name?: string;
  notes?: string;
  status: VendorStatus;
  credit_limit?: number;
}

// ─── Product picker (source data for building a vendor order) ───────────

export interface VendorOrderableProduct {
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name?: string | null;
  sku: string | null;
  warehouse_stock: number;
  tp_price: number;
  base_price: number; // acts as MRP
}

// ─── Vendor order (dispatch / invoice) ───────────────────────────────────

export interface VendorOrderItem {
  id: string;
  vendor_order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  sku: string | null;
  quantity: number;
  original_tp: number;
  increase_percent: number;
  vendor_tp: number;
  mrp: number | null;
  line_total: number;
}

export interface VendorOrder {
  id: string;
  store_id: string;
  vendor_id: string;
  invoice_number: string;
  status: VendorOrderStatus;
  order_date: string;
  invoice_date: string | null;
  delivery_date: string | null;
  delivery_person: string | null;
  vehicle_number: string | null;
  reference_number: string | null;
  notes: string | null;
  total_quantity: number;
  subtotal: number;
  delivery_cost: number;
  discount_amount: number;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
  items?: VendorOrderItem[];
}

export interface VendorOrderItemInput {
  product_id: string;
  variant_id: string | null;
  product_name: string;
  sku: string | null;
  quantity: number;
  original_tp: number;
  increase_percent: number;
  vendor_tp: number;
  mrp: number | null;
}

export interface CreateVendorOrderInput {
  store_id: string;
  vendor_id: string;
  order_date: string;
  invoice_date?: string | null;
  delivery_date?: string | null;
  delivery_person?: string;
  vehicle_number?: string;
  reference_number?: string;
  notes?: string;
  delivery_cost?: number;
  discount_amount?: number;
  paid_amount?: number;
  created_by?: string | null;
  items: VendorOrderItemInput[];
}

// ─── Vendor stock (current pool held by a vendor) ─────────────────────────

export interface VendorStockRow {
  id: string;
  vendor_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  sku: string | null;
  quantity_available: number;
  last_vendor_tp: number | null;
  updated_at: string;
}

// ─── Settlement (owner records sold/returned/payment on a visit) ─────────

// Mirrors src/lib/types/enums.ts PaymentMethod (orders' payment_method) so
// "how the vendor paid" uses the same vocabulary as the rest of the app.
export type VendorPaymentMethod =
  | "cod"
  | "cash"
  | "online"
  | "card"
  | "bank_transfer"
  | "mobile_banking";

export interface VendorSettlementItemInput {
  product_id: string;
  variant_id: string | null;
  sold_quantity: number;
  returned_quantity: number;
  unit_price: number;
}

export interface RecordVendorSettlementInput {
  store_id: string;
  vendor_id: string;
  settlement_date: string;
  items: VendorSettlementItemInput[];
  payment_amount?: number;
  payment_method?: VendorPaymentMethod;
  notes?: string;
  created_by?: string | null;
}

export interface VendorSettlementItem {
  id: string;
  settlement_id: string;
  product_id: string;
  variant_id: string | null;
  product_name?: string;
  sold_quantity: number;
  returned_quantity: number;
  unit_price: number;
  receivable_amount: number;
}

export interface VendorSettlement {
  id: string;
  store_id: string;
  vendor_id: string;
  settlement_date: string;
  notes: string | null;
  total_receivable: number;
  total_payment: number;
  created_at: string;
  items?: VendorSettlementItem[];
}

export interface VendorPayment {
  id: string;
  store_id: string;
  vendor_id: string;
  settlement_id: string | null;
  amount: number;
  payment_method: VendorPaymentMethod;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

// ─── Ledger (unified dispatch / settlement / payment history) ────────────

export type VendorLedgerEntryType = "dispatch" | "settlement" | "payment";

export interface VendorLedgerEntry {
  type: VendorLedgerEntryType;
  date: string;
  reference: string; // invoice number, settlement id short, or payment note
  description: string;
  quantity?: number;
  receivable?: number; // increases due (dispatch has none; settlement sold does)
  paid?: number; // decreases due
  paymentMethod?: VendorPaymentMethod; // only set on "payment" entries
}

export interface VendorDashboardStats {
  vendor_id: string;
  current_stock_count: number;
  total_dispatched: number;
  total_sold: number;
  total_returned: number;
  total_receivable: number;
  total_paid: number;
  current_due: number;
  last_payment_date: string | null;
  // Margin built into confirmed dispatches: qty * (vendor_tp - original_tp).
  // This is margin on stock sent out, not margin confirmed-realized on what
  // actually sold — original_tp isn't tracked at settlement time, so a
  // precise "realized" figure isn't available from current data.
  margin_dispatched: number;
  // Count of vendor_stock rows with quantity_available > 0 that haven't
  // moved (no dispatch/settlement touching them) in over 30 days.
  slow_moving_count: number;
}

// ─── Vendors list — at-a-glance business snapshot per vendor row ─────────

export interface VendorListSummary {
  vendor_id: string;
  stock_quantity: number;
  stock_value: number;
  current_due: number;
  last_payment_date: string | null;
}

export interface VendorsOverviewStats {
  total_vendors: number;
  total_receivable: number;
  total_paid: number;
  total_due: number;
  total_stock_value: number;
  collected_this_week: number;
  collected_this_month: number;
  total_margin_dispatched: number;
  slow_moving_stock_value: number;
}
