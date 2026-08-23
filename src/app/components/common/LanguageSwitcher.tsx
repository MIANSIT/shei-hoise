"use client";

import { useLanguageStore } from "@/lib/store/languageStore";

export default function LanguageSwitcher() {
  const { lang, toggle } = useLanguageStore();

  return (
    <button
      onClick={toggle}
      aria-label="Switch language"
      className="flex items-center gap-0.5 rounded-lg border border-border overflow-hidden text-[11px] font-bold tracking-wide transition-colors hover:border-border"
    >
      <span
        className={`px-2 py-1.5 transition-colors ${
          lang === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </span>
      <span
        className={`px-2 py-1.5 transition-colors ${
          lang === "bn"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        বাং
      </span>
    </button>
  );
}
