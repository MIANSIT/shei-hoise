import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Faq } from "@/lib/types/faq";

// Rows still carrying a "[[PLACEHOLDER: …]]" note are drafts waiting on facts
// from the owner — never show them publicly, even if they get published early.
const PLACEHOLDER_MARKER = "[[PLACEHOLDER";

/**
 * Published FAQs for the public landing page, in display order. Read with the
 * service role on the server so the page works regardless of RLS on `faqs`;
 * only published rows are ever selected.
 * @returns the FAQs, or an empty list if the query fails (the section then hides)
 */
export async function getPublishedFaqs(): Promise<Faq[]> {
  const { data, error } = await supabaseAdmin
    .from("faqs")
    .select("id, question_en, answer_en, question_bn, answer_bn, sort_order, is_published")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getPublishedFaqs]", error.message);
    return [];
  }

  return ((data ?? []) as Faq[]).filter(
    (faq) =>
      !faq.answer_en.includes(PLACEHOLDER_MARKER) && !faq.answer_bn.includes(PLACEHOLDER_MARKER),
  );
}
