// components/skeletons/StorePageSkeleton.tsx
import { ProductGridSkeleton } from "./ProductGridSkeleton";

export function StorePageSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Filter bar skeleton — mirrors ProductFilterSection ── */}
        <FilterBarSkeleton />

        {/* ── Product grid ── */}
        <ProductGridSkeleton count={10} />
      </div>
    </div>
  );
}

// ── Filter bar ─────────────────────────────────────────────────────────────────
function FilterBarSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      {/* Left: category pill chips */}
      <div className="flex items-center gap-2 overflow-hidden">
        {/* "All Products" active pill */}
        <div className="h-9 w-28 rounded-xl bg-gray-900/10 dark:bg-gray-100/10 relative overflow-hidden shrink-0">
          <Shimmer />
        </div>
        {/* Additional category pills */}
        {[64, 72, 56].map((w, i) => (
          <div
            key={i}
            className="h-9 rounded-xl bg-gray-100 dark:bg-gray-800 relative overflow-hidden shrink-0"
            style={{ width: `${w}px`, animationDelay: `${i * 60}ms` }}
          >
            <Shimmer />
          </div>
        ))}
      </div>

      {/* Right: search bar */}
      <div className="h-9 w-full sm:w-56 rounded-xl bg-gray-100 dark:bg-gray-800 relative overflow-hidden shrink-0">
        <Shimmer />
        {/* Fake search icon hint */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

// ── Shared shimmer sweep ───────────────────────────────────────────────────────
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
