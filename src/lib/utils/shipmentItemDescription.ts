interface ShipmentItem {
  product_name: string;
  quantity: number;
  variant_details?: { variant_name?: string | null } | null;
}

/** Couriers cap the item text (Paperfly's productBrief is 250); stay under it. */
const MAX_LENGTH = 250;

/**
 * The parcel's item text sent to the courier (Pathao, Paperfly, Steadfast):
 * "Cat Food 1.3kg (Chicken) x2, Shampoo x1", so the rider and the courier's
 * panel show what's inside and how many. Cut with "…" if it's too long.
 * @returns the description, or undefined when the order has no items
 */
export function buildShipmentItemDescription(items: ShipmentItem[] | null | undefined): string | undefined {
  if (!items?.length) return undefined;
  const text = items
    .map((item) => {
      const variant = item.variant_details?.variant_name ? ` (${item.variant_details.variant_name})` : "";
      return `${item.product_name}${variant} x${item.quantity}`;
    })
    .join(", ");
  return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1)}…` : text;
}
