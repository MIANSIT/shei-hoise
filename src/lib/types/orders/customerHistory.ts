// Plain module, deliberately not "use server": a file with that directive may
// only export async functions, and both of these are imported by the client
// component that renders the tags.

/** One prior order, trimmed to what the status tags need. */
export interface CustomerHistoryEntry {
  orderId: string;
  orderNumber: string;
  status: string;
  /** The order's own order_date — when the sale actually happened, not when
   *  the row was inserted (those diverge for backfilled/manually-dated
   *  orders, where created_at is just the import time). */
  orderDate: string;
}

/** How many prior orders the UI shows per customer. */
export const HISTORY_LIMIT = 5;
