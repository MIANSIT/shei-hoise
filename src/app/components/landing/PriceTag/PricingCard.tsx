"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import PriceTag from "@/app/components/landing/PriceTag/PriceTag";

interface PricingCardProps {
  name: string;
  description: string;
  features: string[];
  originalPrice: number;
  discountedPrice: number;
  months: number;
  highlighted?: boolean;
}

export default function PricingCard({
  name,
  description,
  features,
  originalPrice,
  discountedPrice,
  months,
  highlighted,
}: PricingCardProps) {
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
      {highlighted && (
        <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-chart-3 text-white px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-medium">
            Most Popular
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
      />

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

      <Button
        className={`w-full ${
          highlighted
            ? "bg-white text-chart-2 hover:bg-white/90"
            : "bg-chart-2 hover:bg-chart-2/90 text-white"
        }`}
        size="lg"
      >
        Get Started
      </Button>
    </motion.div>
  );
}
