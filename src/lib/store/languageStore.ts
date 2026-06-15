import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Lang } from "@/lib/i18n/translations";

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      lang: "en",
      setLang: (lang) => set({ lang }),
      toggle: () => set({ lang: get().lang === "en" ? "bn" : "en" }),
    }),
    { name: "shei-lang" },
  ),
);
