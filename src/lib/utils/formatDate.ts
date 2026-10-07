/**
 * The one date format used across the app: DD-MM-YYYY (time as 12-hour
 * "hh:mm AM/PM"). A plain date such as `orders.order_date` ("YYYY-MM-DD") is
 * formatted as written — never run through `new Date()`, which reads it as UTC
 * midnight and shifts it (and invents a 6:00 AM time) in Bangladesh.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number): string => String(value).padStart(2, "0");

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @param value ISO timestamp, "YYYY-MM-DD" date, or Date
 * @returns "DD-MM-YYYY", or "" when the value is missing/invalid
 */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (typeof value === "string") {
    const match = DATE_ONLY.exec(value);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  }
  const date = toDate(value);
  if (!date) return "";
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

/**
 * @param value ISO timestamp or Date
 * @returns "hh:mm AM/PM", or "" when the value is missing/invalid
 */
export function formatTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  const hours = date.getHours();
  return `${pad(hours % 12 || 12)}:${pad(date.getMinutes())} ${hours >= 12 ? "PM" : "AM"}`;
}

/**
 * @param value ISO timestamp or Date
 * @returns "DD-MM-YYYY, hh:mm AM/PM", or "" when the value is missing/invalid
 */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return `${formatDate(date)}, ${formatTime(date)}`;
}
