import type { Lang } from "@/lib/i18n/translations";
import { toLocalDigits } from "@/lib/i18n/numeral";

/** Fills "{name}"-style placeholders in a translated string; numbers get local digits. */
export function fillTemplate(
  template: string,
  values: Record<string, string | number>,
  lang: Lang,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    if (value === undefined) return match;
    return typeof value === "number" ? toLocalDigits(value, lang) : value;
  });
}

/** "12 Sep 2026, 3:05 pm" in the viewer's language. */
export function formatDateTime(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(iso));
}

/** A readable random password for the owner to hand over (no look-alike characters). */
export function generatePassword(length = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
