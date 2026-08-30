"use client";

import React, { useState } from "react";
import ProductReviewsTable from "./ProductReviewsTable";
import StoreReviewsTable from "./StoreReviewsTable";

type ReviewsTab = "product" | "store";

const TABS: { key: ReviewsTab; label: string }[] = [
  { key: "product", label: "Product Reviews" },
  { key: "store", label: "Store Reviews" },
];

const Reviews: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReviewsTab>("product");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeTab === "product"
            ? "Customer reviews across all your products."
            : "Customer reviews of your store as a seller."}{" "}
          Hide anything inappropriate — it won&apos;t show on the storefront until you show it
          again.
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "product" ? <ProductReviewsTable /> : <StoreReviewsTable />}
    </div>
  );
};

export default Reviews;
