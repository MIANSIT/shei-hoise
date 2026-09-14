/**
 * Resolves the timestamp an invoice/receipt should print as the order's date.
 *
 * `orders.order_date` is a plain `date` column (see schema.sql) and is what the
 * admin actually sets when creating, editing or back-dating an order — so it,
 * not the row's `created_at` (when the record happened to be inserted), is the
 * date an invoice must show. Since a date-only value carries no clock time, the
 * time of day still comes from `created_at`.
 *
 * @param orderDate "YYYY-MM-DD" (or an ISO string) from `orders.order_date`
 * @param createdAt ISO timestamp from `orders.created_at`
 * @returns ISO timestamp to render, or undefined when neither is available
 */
export function resolveOrderInvoiceDate(
  orderDate: string | null | undefined,
  createdAt: string | null | undefined,
): string | undefined {
  const created = createdAt ? new Date(createdAt) : null;
  const hasCreated = !!created && !Number.isNaN(created.getTime());

  if (!orderDate) return hasCreated ? created!.toISOString() : undefined;

  const [year, month, day] = orderDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) {
    return hasCreated ? created!.toISOString() : undefined;
  }

  // Keep the insertion time-of-day, swap in the calendar day the admin chose.
  const resolved = hasCreated ? new Date(created!) : new Date();
  resolved.setFullYear(year, month - 1, day);
  return resolved.toISOString();
}
