export interface CodSettlement {
  id: string;
  store_id: string;
  courier: string | null;
  settlement_date: string; // YYYY-MM-DD
  total_amount: number;
  order_count: number;
  note: string | null;
  created_at: string;
}

/** A delivered COD order not yet included in any settlement — a candidate for the next payout batch. */
export interface UnsettledCodOrder {
  id: string;
  order_number: string;
  order_date: string;
  courier: string | null;
  customer_name: string;
  total_amount: number;
}
