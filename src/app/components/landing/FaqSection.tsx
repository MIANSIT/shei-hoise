"use client";

import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLanguageStore } from "@/lib/store/languageStore";
import type { Faq } from "@/lib/types/faq";
import { safeJsonLd } from "@/lib/utils/safeJsonLd";

interface FaqSectionProps {
  faqs: readonly Faq[];
}

/**
 * Landing-page FAQ. Every answer is real text in the server-rendered HTML
 * (native <details>, collapsed visually only), so crawlers read all of it.
 * The FAQPage JSON-LD is emitted from the same rows, always in English, to
 * match the language the page is first served in.
 */
export function FaqSection({ faqs }: FaqSectionProps) {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);

  if (faqs.length === 0) return null;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question_en,
      acceptedAnswer: { "@type": "Answer", text: faq.answer_en },
    })),
  };

  return (
    <section className="py-16 md:py-20 px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
      <div className="container mx-auto text-center mb-10 md:mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.landing.faqTitle}</h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          {t.landing.faqSubtitle}
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.id}
            className="group rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left [&::-webkit-details-marker]:hidden">
              <h3 className="text-base md:text-lg font-semibold">
                {lang === "bn" ? faq.question_bn : faq.question_en}
              </h3>
              <ChevronDown
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              {lang === "bn" ? faq.answer_bn : faq.answer_en}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
