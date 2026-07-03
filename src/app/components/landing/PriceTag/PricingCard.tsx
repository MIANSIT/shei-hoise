"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Gift } from "lucide-react";
import PriceTag from "@/app/components/landing/PriceTag/PriceTag";
import { useTranslation } from "@/lib/hook/useTranslation";

interface PricingCardProps {
  name: string;
  description: string;
  features: string[];
  originalPrice: number;
  discountedPrice: number;
  months: number;
  highlighted?: boolean;
  badge?: string | null;
  trialDays?: number;
  currency?: string;
}

export default function PricingCard({
  name,
  description,
  features,
  originalPrice,
  discountedPrice,
  months,
  highlighted,
  badge,
  trialDays = 0,
  currency = "৳",
}: PricingCardProps) {
  const t = useTranslation();
  const badgeColor =
    badge === "Best Value"
      ? "bg-green-500"
      : badge === "Most Popular"
        ? "bg-chart-3"
        : "bg-chart-3";

  const hasTrialBtn = trialDays > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ scale: 1.02 }}
      className={`relative rounded-2xl p-6 md:p-8 ${
        highlighted
          ? "bg-chart-2 text-white shadow-2xl border-0"
          : "bg-card border shadow-lg"
      }`}
    >
      {badge && (
        <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2">
          <span
            className={`${badgeColor} text-white px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-medium whitespace-nowrap`}
          >
            {badge}
          </span>
        </div>
      )}

      <h3
        className={`text-xl md:text-2xl font-bold mb-2 ${
          highlighted ? "text-white" : ""
        }`}
      >
        {name}
      </h3>
      <p
        className={`mb-4 md:mb-6 text-sm md:text-base ${
          highlighted ? "text-white/80" : "text-muted-foreground"
        }`}
      >
        {description}
      </p>

      <PriceTag
        originalPrice={originalPrice}
        discountedPrice={discountedPrice}
        months={months}
        highlighted={highlighted}
        currency={currency}
      />

      {/* Free Trial Banner — only shown when trial_days > 0 */}
      {trialDays > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-5 md:mb-6 ${
            highlighted
              ? "bg-white/15 border border-white/25"
              : "bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
          }`}
        >
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
              highlighted ? "bg-white/25" : "bg-emerald-100 dark:bg-emerald-900"
            }`}
          >
            <Gift
              className={`w-4 h-4 ${
                highlighted
                  ? "text-white"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-bold leading-none mb-1 ${
                highlighted
                  ? "text-white"
                  : "text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {trialDays} days FREE
            </p>
            <p
              className={`text-xs leading-none ${
                highlighted
                  ? "text-white/65"
                  : "text-emerald-600/80 dark:text-emerald-500"
              }`}
            >
              then your plan starts · cancel anytime
            </p>
          </div>
          <ArrowRight
            className={`w-4 h-4 shrink-0 ${
              highlighted ? "text-white/60" : "text-emerald-400"
            }`}
          />
        </motion.div>
      )}

      {features.length > 0 && (
        <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 md:gap-3">
              <CheckCircle
                className={`w-4 h-4 md:w-5 md:h-5 mt-0.5 shrink-0 ${
                  highlighted ? "text-white" : "text-chart-2"
                }`}
              />
              <span
                className={`text-sm md:text-base ${
                  highlighted ? "text-white/90" : ""
                }`}
              >
                {feature}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Button
          className={`w-full ${
            highlighted
              ? "bg-white text-chart-2 hover:bg-white/90"
              : "bg-chart-2 hover:bg-chart-2/90 text-white"
          }`}
          size="lg"
        >
          {hasTrialBtn ? t.landing.startFreeTrial : "Get Started"}
        </Button>
        {hasTrialBtn && (
          <p
            className={`text-center text-xs mt-2 ${
              highlighted ? "text-white/55" : "text-muted-foreground"
            }`}
          >
            {t.landing.noPayment}
          </p>
        )}
      </div>
    </motion.div>
  );
}
