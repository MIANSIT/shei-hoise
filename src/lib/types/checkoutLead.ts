export interface CheckoutLeadItem {
  name: string;
  quantity: number;
  price: number;
}

/** A shopper who typed a phone number at checkout and hasn't ordered (yet). */
export interface CheckoutLead {
  id: string;
  /** Local format, 11 digits starting 01. */
  phone: string;
  customerName: string | null;
  city: string | null;
  items: CheckoutLeadItem[];
  numItems: number;
  cartValue: number;
  currency: string | null;
  /** ISO timestamp of the last time the shopper touched checkout. */
  updatedAt: string;
}
