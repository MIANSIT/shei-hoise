"use client";

interface PriceTagProps {
  originalPrice: number;
  discountedPrice: number;
  months: number;
  highlighted?: boolean;
  currency?: string;
}

export default function PriceTag({
  originalPrice,
  discountedPrice,
  months,
  highlighted,
  currency = "৳",
}: PriceTagProps) {
  const showOriginal = originalPrice > 0 && originalPrice > discountedPrice;
  const savePercent = showOriginal
    ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
    : 0;
  const perMonth =
    months > 1 ? Math.round(discountedPrice / months) : discountedPrice;

  const periodLabel =
    months === 12 ? "/ year" : months > 1 ? `/ ${months} months` : "/ month";

  const billedLabel =
    months === 12
      ? `Billed yearly · ${currency}${perMonth}/month`
      : "Billed monthly";

  return (
    <div className="mb-4 md:mb-6 flex flex-col items-center">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {showOriginal && (
          <span className="text-red-500 text-lg md:text-xl line-through">
            {currency}{originalPrice}
          </span>
        )}
        <span className="text-3xl md:text-4xl font-bold">
          {currency}{discountedPrice}
        </span>
        <span className={highlighted ? "text-white/80" : "text-muted-foreground"}>
          {periodLabel}
        </span>
      </div>
      {showOriginal ? (
        <span
          className={`mt-1 text-sm md:text-base font-medium ${
            highlighted ? "text-white/90" : "text-green-500"
          }`}
        >
          Save {savePercent}% · {currency}{perMonth}/month
        </span>
      ) : (
        <span
          className={`mt-1 text-sm md:text-base font-medium ${
            highlighted ? "text-white/90" : "text-muted-foreground"
          }`}
        >
          {billedLabel}
        </span>
      )}
    </div>
  );
}
