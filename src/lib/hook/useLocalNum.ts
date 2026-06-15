import { useLanguageStore } from "@/lib/store/languageStore";
import { toLocalDigits } from "@/lib/i18n/numeral";

/**
 * Returns a formatter that converts any digit in a value to
 * Bangla numerals when the active language is 'bn'.
 */
export function useLocalNum() {
  const lang = useLanguageStore((s) => s.lang);
  return (value: number | string) => toLocalDigits(value, lang);
}
