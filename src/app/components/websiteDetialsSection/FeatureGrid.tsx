// components/sections/FeatureGrid.tsx
import React from "react";
import FeatureCard from "./FeatureCard";
import { Feature } from "@/lib/types/content.types";

interface FeatureGridProps {
  features: Feature[];
  title?: string;
  description?: string;
}

const FeatureGrid: React.FC<FeatureGridProps> = ({
  features,
  title,
  description,
}) => {
  return (
    <section className="mb-16">
      {(title || description) && (
        <div className="text-center mb-12">
          {title && <h2 className="text-3xl font-bold  mb-4">{title}</h2>}
          {description && (
            <p className="text-xl  max-w-2xl mx-auto">{description}</p>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  );
};

export default FeatureGrid;
