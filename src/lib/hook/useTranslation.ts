import { useLanguageStore } from "@/lib/store/languageStore";
import { translations } from "@/lib/i18n/translations";

export function useTranslation() {
  const lang = useLanguageStore((s) => s.lang);
  return translations[lang];
}
