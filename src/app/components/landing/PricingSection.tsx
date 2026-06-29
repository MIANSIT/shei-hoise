"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import PricingCard from "@/app/components/landing/PriceTag/PricingCard";
import { useTranslation } from "@/lib/hook/useTranslation";
import {
  getPublicPlans,
  orderPlansWithFeaturedInMiddle,
  parseFeatures,
  type PublicPlan,
} from "@/lib/queries/subscription/getPublicPlans";
import { CURRENCY_ICONS, Currency } from "@/lib/types/enums";

type BillingCycle = "monthly" | "yearly";

function getCurrencySymbol(code: string): string {
  return CURRENCY_ICONS[code as Currency] ?? code;
}

function getPriceProps(
  plan: PublicPlan,
  billing: BillingCycle,
): { months: number; discountedPrice: number; originalPrice: number } {
  if (billing === "yearly" && plan.price_yearly > 0) {
    return {
      months: 12,
      discountedPrice: plan.price_yearly,
      originalPrice: plan.price_monthly * 12,
    };
  }
  return { months: 1, discountedPrice: plan.price_monthly, originalPrice: 0 };
}

export default function PricingSection() {
  const t = useTranslation();
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingCycle>("monthly");

  useEffect(() => {
    getPublicPlans()
      .then((data) => setPlans(orderPlansWithFeaturedInMiddle(data)))
      .finally(() => setLoading(false));
  }, []);

  const hasYearly = plans.some((p) => p.price_yearly > 0);

  return (
    <section id="pricing" className="py-16 md:py-20 px-6 bg-muted/30">
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 bg-linear-to-r from-green-600 to-emerald-500 text-white px-5 py-2.5 rounded-full shadow-lg">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-sm md:text-base">
              {t.landing.limitedOffer}
            </span>
            <Sparkles className="w-4 h-4 shrink-0" />
          </div>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          {t.landing.pricingTitle}
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          {t.landing.pricingSubtitle}
        </p>

        {/* Monthly / Yearly toggle — only shown when at least one plan has yearly pricing */}
        {!loading && hasYearly && (
          <div className="inline-flex items-center mt-8 rounded-full border border-border bg-background p-1 gap-1 shadow-sm">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                billing === "monthly"
                  ? "bg-chart-2 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billing === "yearly"
                  ? "bg-chart-2 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                  billing === "yearly"
                    ? "bg-white/20 text-white"
                    : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                }`}
              >
                Save
              </span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-card border shadow-lg p-8 animate-pulse"
            >
              <div className="h-6 bg-muted rounded w-1/2 mb-3" />
              <div className="h-4 bg-muted rounded w-3/4 mb-6" />
              <div className="h-10 bg-muted rounded w-2/3 mx-auto mb-6" />
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-muted rounded w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No plans available at the moment.
        </p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const { months, discountedPrice, originalPrice } = getPriceProps(
              plan,
              billing,
            );
            return (
              <PricingCard
                key={plan.id}
                name={plan.name}
                description={plan.description ?? ""}
                features={parseFeatures(plan.features)}
                months={months}
                originalPrice={originalPrice}
                discountedPrice={discountedPrice}
                highlighted={plan.is_featured}
                badge={plan.is_featured ? t.landing.mostPopular : null}
                trialDays={plan.trial_days}
                currency={getCurrencySymbol(plan.currency)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
