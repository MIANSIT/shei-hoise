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
  /** What the customer still owes on the order — total_amount minus anything they already paid directly (e.g. via Customer Dues). The courier collects this from the customer. */
  due_remaining: number;
  /** The courier's own delivery charge, kept out of what they collected — the latest recorded actual delivery cost, or the shipping fee charged to the customer when none is recorded yet. */
  courier_deduction: number;
  /** What the courier actually hands over to the store: due_remaining minus courier_deduction. */
  expected_from_courier: number;
}
