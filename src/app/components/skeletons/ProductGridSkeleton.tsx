// components/skeletons/ProductGridSkeleton.tsx

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 mt-4 sm:mt-6 mb-8 items-stretch">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

function ProductCardSkeleton({ index }: { index: number }) {
  // Staggered shimmer delay so cards animate in sequence
  const delay = `${Math.min(index * 40, 320)}ms`;

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
      style={{ animationDelay: delay }}
    >
      {/* ── Image placeholder — square, exact match to ProductCard ── */}
      <div
        className="relative w-full overflow-hidden bg-gray-100 dark:bg-gray-800"
        style={{ aspectRatio: "1/1" }}
      >
        <Shimmer />

        {/* Badge placeholders — top-left category chip + top-right discount */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none z-10">
          <div className="h-5 w-16 rounded-full bg-white/60 dark:bg-gray-700/60" />
          <div className="h-5 w-10 rounded-full bg-white/60 dark:bg-gray-700/60" />
        </div>
      </div>

      {/* ── Info block — mirrors p-3 sm:p-4 gap-2 flex-col flex-1 ── */}
      <div className="flex flex-col p-3 sm:p-4 gap-2 flex-1">
        {/* Row 1 — Name: 2-line reserved height (h-10 sm:h-11) */}
        <div className="h-10 sm:h-11 flex flex-col justify-start gap-1.5">
          <SkeletonBar className="h-3.5 w-full" delay={delay} />
          <SkeletonBar className="h-3.5 w-4/5" delay={delay} />
        </div>

        {/* Row 2 — Price block: h-13 sm:h-14 */}
        <div className="h-13 sm:h-14 flex flex-col justify-center gap-2">
          {/* Price + strikethrough */}
          <div className="flex items-baseline gap-2">
            <SkeletonBar className="h-5 w-20" delay={delay} />
            <SkeletonBar className="h-3.5 w-12 opacity-60" delay={delay} />
          </div>
          {/* Variant dots row */}
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
            <SkeletonBar className="h-2.5 w-16 ml-1" delay={delay} />
          </div>
        </div>

        {/* Row 3 — Button(s): h-9, always stuck to bottom via mt-auto */}
        <div className="flex gap-1.5 mt-auto">
          <SkeletonBar className="h-9 flex-1 rounded-xl" delay={delay} />
          <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 relative overflow-hidden shrink-0">
            <Shimmer />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shimmer overlay ────────────────────────────────────────────────────────────
function Shimmer() {
  return (
    <div
      className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.32) 50%, rgba(255,255,255,0.18) 60%, transparent 100%)",
      }}
    />
  );
}

// ── Individual skeleton bar with shimmer ──────────────────────────────────────
function SkeletonBar({
  className = "",
  // delay = "0ms",
}: {
  className?: string;
  delay?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800 ${className}`}
    >
      <Shimmer />
    </div>
  );
}
