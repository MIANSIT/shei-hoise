"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const categories = [
  "All",
  "Audio",
  "Electronics",
  "Furniture",
  "Photography",
  "Wearables",
];

interface ProductFilterSectionProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function ProductFilterSection({
  activeCategory,
  onCategoryChange,
}: ProductFilterSectionProps) {
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };

  const buttonVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
  };

  return (
    <section className="w-full">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Products</h2>
          <p className="text-muted-foreground">
            Browse our latest products and find something you&apos;ll love.
          </p>
        </div>

        <motion.div
          className="flex flex-wrap gap-2 md:justify-end"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {categories.map((category) => (
            <motion.div key={category} variants={buttonVariants}>
              <Button
                variant={activeCategory === category ? "default" : "outline"}
                className={`rounded-full px-4 py-1 text-sm transition ${
                  activeCategory === category
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-transparent text-foreground hover:bg-accent border-border"
                }`}
                onClick={() => onCategoryChange(category)}
              >
                {category}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}