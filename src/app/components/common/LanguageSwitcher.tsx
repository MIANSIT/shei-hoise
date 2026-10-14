"use client";

import { useLanguageStore } from "@/lib/store/languageStore";

interface LanguageSwitcherProps {
  /** "header" sits on the store's header color, so the idle language and the border follow the header's text color. */
  tone?: "default" | "header";
}

export default function LanguageSwitcher({ tone = "default" }: LanguageSwitcherProps) {
  const { lang, toggle } = useLanguageStore();
  const onHeader = tone === "header";

  const idle = onHeader
    ? "text-header-foreground/70 hover:text-header-foreground"
    : "text-muted-foreground hover:text-foreground";

  return (
    <button
      onClick={toggle}
      aria-label="Switch language"
      className={`flex items-center gap-0.5 rounded-lg border overflow-hidden text-[11px] font-bold tracking-wide transition-colors ${
        onHeader ? "border-header-foreground/30 hover:border-header-foreground/30" : "border-border hover:border-border"
      }`}
    >
      <span
        className={`px-2 py-1.5 transition-colors ${
          lang === "en" ? "bg-primary text-primary-foreground" : idle
        }`}
      >
        EN
      </span>
      <span
        className={`px-2 py-1.5 transition-colors ${
          lang === "bn" ? "bg-primary text-primary-foreground" : idle
        }`}
      >
        বাং
      </span>
    </button>
  );
}
