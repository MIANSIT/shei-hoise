// Plain module, deliberately not "use server": a file with that directive may
// only export async functions, and both of these are imported by the client
// component that renders the tags.

/** One prior order, trimmed to what the status tags need. */
export interface CustomerHistoryEntry {
  orderId: string;
  orderNumber: string;
  status: string;
  createdAt: string;
}

/** How many prior orders the UI shows per customer. */
export const HISTORY_LIMIT = 5;
