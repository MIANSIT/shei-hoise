// utils/currency.ts or lib/utils/currency.ts
import { Currency, CURRENCY_ICONS } from "@/lib/types/enums";

/**
 * Safely validate and get currency from string
 */
export function getValidCurrency(currencyString?: string): Currency {
  if (!currencyString) return Currency.BDT;
  
  return Object.values(Currency).includes(currencyString as Currency)
    ? (currencyString as Currency)
    : Currency.BDT;
}

/**
 * Get currency symbol safely
 */
export function getCurrencySymbol(currencyString?: string): string {
  const currency = getValidCurrency(currencyString);
  return CURRENCY_ICONS[currency];
}