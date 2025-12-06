// components/sections/CTASection.tsx
import React from "react";
import Link from "next/link";
import { CTASectionProps } from "@/lib/types/content.types";

const CTASection: React.FC<CTASectionProps> = ({
  title,
  description,
  buttonText,
  buttonHref,
  variant = "primary",
}) => {
  const isPrimary = variant === "primary";

  // Background + text combos based on your global theme tokens
  const containerClass = isPrimary
    ? "bg-primary text-primary-foreground"
    : "bg-accent text-accent-foreground border border-border";

  // Button styling
  const buttonClass = isPrimary
    ? "bg-primary-foreground text-primary hover:shadow-xl hover:scale-105"
    : "bg-primary text-primary-foreground hover:shadow-xl hover:scale-105";

  return (
    <section
      className={`rounded-2xl p-10 md:p-12 text-center mb-12 shadow-lg ${containerClass}`}
    >
      <h2 className="text-3xl md:text-4xl font-bold mb-5">{title}</h2>

      <p
        className={`text-xl mb-8 max-w-2xl mx-auto ${
          isPrimary ? "text-primary-foreground/80" : "text-foreground/70"
        }`}
      >
        {description}
      </p>

      <Link
        href={buttonHref}
        className={`inline-flex items-center px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${buttonClass}`}
      >
        {buttonText}
        <svg
          className="w-5 h-5 ml-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </Link>
    </section>
  );
};

export default CTASection;
