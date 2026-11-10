/**
 * Quick Sale can sell a line at a changed MRP (e.g. a platform that adds its
 * service charge). The order keeps the product's own price in unit_price and
 * books the difference in additional_charges, so stock, product sales and
 * profit reports treat it like an extra charge. Only the invoice prints the
 * changed price — these helpers turn the stored figures back into it.
 */

interface PricedLine {
  quantity: number;
  unit_price: number;
  invoice_unit_price?: number | null;
}

/** The per-unit price the invoice prints for a line. */
export function invoiceUnitPrice(line: PricedLine): number {
  return line.invoice_unit_price != null ? Number(line.invoice_unit_price) : Number(line.unit_price);
}

/** How much the changed prices add over the product prices — the part of additional_charges they account for. */
export function invoicePriceMarkup(lines: readonly PricedLine[]): number {
  return lines.reduce(
    (sum, line) => sum + (invoiceUnitPrice(line) - Number(line.unit_price)) * line.quantity,
    0,
  );
}

/**
 * The subtotal and additional charges to print: the markup moves from the
 * extra-charge line into the item prices, so the total is unchanged.
 */
export function invoiceTotals(
  lines: readonly PricedLine[],
  subtotal: number,
  additionalCharges: number,
): { subtotal: number; additionalCharges: number } {
  const markup = invoicePriceMarkup(lines);
  return {
    subtotal: subtotal + markup,
    additionalCharges: Math.max(0, additionalCharges - markup),
  };
}
