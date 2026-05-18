"use client";

interface PriceTagProps {
  originalPrice: number;
  discountedPrice: number;
  months: number;
  highlighted?: boolean;
}

export default function PriceTag({
  originalPrice,
  discountedPrice,
  months,
  highlighted,
}: PriceTagProps) {
  const showOriginal = originalPrice > 0 && originalPrice > discountedPrice;
  const savePercent = showOriginal
    ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
    : 0;
  const perMonth = Math.round(discountedPrice / months);

  return (
    <div className="mb-4 md:mb-6 flex flex-col items-center">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {showOriginal && (
          <span className="text-red-500 text-lg md:text-xl line-through">
            ৳{originalPrice}
          </span>
        )}
        <span className="text-3xl md:text-4xl font-bold">
          ৳{discountedPrice}
        </span>
        <span
          className={highlighted ? "text-white/80" : "text-muted-foreground"}
        >
          {months > 1 ? `/ ${months} months` : "/month"}
        </span>
      </div>
      {showOriginal ? (
        <span
          className={`mt-1 text-sm md:text-base font-medium ${
            highlighted ? "text-white/90" : "text-green-500"
          }`}
        >
          Save {savePercent}% • ৳{perMonth}/month
        </span>
      ) : (
        <span
          className={`mt-1 text-sm md:text-base font-medium ${
            highlighted ? "text-white/90" : "text-muted-foreground"
          }`}
        >
          Billed monthly
        </span>
      )}
    </div>
  );
}
