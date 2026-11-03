/** "October 2026" (or the Bangla form) for a YYYY-MM-DD date, without any time zone shift. */
export function formatMonthLabel(isoDate: string, lang: "en" | "bn"): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
