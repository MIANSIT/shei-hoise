import { Lang } from "./translations";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toLocalDigits(value: number | string, lang: Lang): string {
  return String(value).replace(/[0-9]/g, (d) =>
    lang === "bn" ? BN_DIGITS[Number(d)] : d,
  );
}
