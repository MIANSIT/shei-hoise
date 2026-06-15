"use client";

import { useLanguageStore } from "@/lib/store/languageStore";

export default function LanguageSwitcher() {
  const { lang, toggle } = useLanguageStore();

  return (
    <button
      onClick={toggle}
      aria-label="Switch language"
      className="flex items-center gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-[11px] font-bold tracking-wide transition-colors hover:border-gray-400 dark:hover:border-gray-500"
    >
      <span
        className={`px-2 py-1.5 transition-colors ${
          lang === "en"
            ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        }`}
      >
        EN
      </span>
      <span
        className={`px-2 py-1.5 transition-colors ${
          lang === "bn"
            ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        }`}
      >
        বাং
      </span>
    </button>
  );
}
