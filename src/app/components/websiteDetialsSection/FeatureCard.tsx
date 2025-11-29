// components/cards/FeatureCard.tsx
import React from "react";
import { Feature } from "@/lib/types/content.types";

interface FeatureCardProps {
  feature: Feature;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature }) => {
  return (
    <div className="bg-card rounded-xl border border-border p-7 shadow-sm hover:shadow-lg transition-all duration-300 group hover:border-primary/50">
      <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-md">
        <div className="text-primary-foreground">{feature.icon}</div>
      </div>
      <h3 className="text-xl font-bold text-card-foreground mb-3 group-hover:text-primary transition-colors duration-200">
        {feature.title}
      </h3>
      <p className="text-muted-foreground leading-relaxed text-lg">
        {feature.description}
      </p>
    </div>
  );
};

export default FeatureCard;
