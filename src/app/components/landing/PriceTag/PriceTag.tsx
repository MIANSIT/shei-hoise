"use client";

interface PriceTagProps {
  originalPrice: number;
  discountedPrice: number;
  months: number;
  highlighted?: boolean;
}

// Helper: Make price end with 49 or 99 BELOW or equal to actual price
const makeMarketingPrice = (num: number) => {
  const hundreds = Math.floor(num / 100) * 100;
  const remainder = num % 100;
  return remainder >= 50 ? hundreds + 99 : hundreds + 49;
};

export default function PriceTag({
  originalPrice,
  discountedPrice,
  months,
  highlighted,
}: PriceTagProps) {
  const marketingOriginal =
    months === 1 ? originalPrice : makeMarketingPrice(originalPrice);
  const marketingDiscounted =
    months === 1 ? discountedPrice : makeMarketingPrice(discountedPrice);

  const savePercent = Math.round(
    ((marketingOriginal - marketingDiscounted) / marketingOriginal) * 100
  );
  const perMonth = Math.round(marketingDiscounted / months);

  return (
    <div className="mb-4 md:mb-6 flex flex-col items-center">
      <div className="flex items-center gap-2">
        <span className="text-red-500 text-lg md:text-xl line-through">
          ৳{marketingOriginal}
        </span>
        <span className="text-3xl md:text-4xl font-bold">
          ৳{marketingDiscounted}
        </span>
        <span
          className={highlighted ? "text-white/80" : "text-muted-foreground"}
        >
          {months > 1 ? ` / ${months} months` : "/month"}
        </span>
      </div>
      <span
        className={`mt-1 text-sm md:text-base font-medium ${
          highlighted ? "text-white/90" : "text-green-500"
        }`}
      >
        Save {savePercent}% • {perMonth}৳/month
      </span>
    </div>
  );
}
