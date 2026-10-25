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

  // Reading order runs down the left column, then the right.
  const half = Math.ceil(faqs.length / 2);
  const firstColumn = faqs.slice(0, half);
  const secondColumn = faqs.slice(half);

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
    <section className="py-8 md:py-10 px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
      <div className="container mx-auto text-center mb-5 md:mb-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{t.landing.faqTitle}</h2>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          {t.landing.faqSubtitle}
        </p>
      </div>

      {/* Two independent stacks (not one grid), so opening an answer only
          moves the boxes below it in its own column. On a phone they stack. */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-x-4 gap-y-2 md:grid-cols-2">
        {[firstColumn, secondColumn].map((column, index) => (
          <div key={index} className="space-y-2">
            {column.map((faq) => (
              <details
                key={faq.id}
                className="group rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left [&::-webkit-details-marker]:hidden">
                  <h3 className="text-sm md:text-base font-semibold">
                    {lang === "bn" ? faq.question_bn : faq.question_en}
                  </h3>
                  <ChevronDown
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">
                  {lang === "bn" ? faq.answer_bn : faq.answer_en}
                </p>
              </details>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
