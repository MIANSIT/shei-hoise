// Skeleton mirroring the store home page layout:
// compact hero → mobile chip strip / desktop category grid → featured strip (mobile) / bento (desktop)
import React from "react";

function Shimmer() {
  return (
    <div
      className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]"
      style={{
        background:
          "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.15) 40%,rgba(255,255,255,0.28) 50%,rgba(255,255,255,0.15) 60%,transparent 100%)",
      }}
    />
  );
}

function Bone({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div style={style} className={`relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 ${className}`}>
      <Shimmer />
    </div>
  );
}

export function StoreHomePageSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8F8F6] dark:bg-gray-950 animate-pulse">

      {/* ── Hero — compact on mobile ── */}
      <div className="relative w-full h-36 sm:h-96 lg:h-120 bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <Shimmer />
        <div className="absolute bottom-0 inset-x-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2.5 sm:pb-7 flex items-end justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3.5">
              <Bone className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl shrink-0" />
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <Bone className="h-3 sm:h-5 w-20 sm:w-36 rounded-md" />
                <Bone className="hidden sm:block h-3 w-48 rounded-md" />
              </div>
            </div>
            <Bone className="h-7 w-14 sm:h-10 sm:w-28 rounded-full shrink-0" />
          </div>
        </div>
      </div>

      {/* ── Mobile: category chip strip ── */}
      <div className="sm:hidden pt-3 pb-1">
        <div className="flex gap-2 px-4 pb-2 overflow-hidden">
          {[56, 72, 60, 80, 52].map((w, i) => (
            <Bone key={i} className="shrink-0 h-9 rounded-full" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* ── Desktop: category card section ── */}
      <div className="hidden sm:block bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-end justify-between mb-10">
            <div className="flex flex-col gap-2">
              <Bone className="h-2.5 w-24 rounded-full" />
              <Bone className="h-7 w-48 rounded-lg" />
            </div>
            <Bone className="h-4 w-16 rounded-md" />
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="h-0.5 bg-gray-100 dark:bg-gray-800" />
                <div className="flex flex-col items-center gap-3 px-3 py-7">
                  <Bone className="w-11 h-11 rounded-xl" />
                  <Bone className="h-3.5 w-3/4 rounded-md" />
                  <Bone className="h-2.5 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Featured section ── */}
      <div className="pt-4 sm:pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="flex items-center justify-between mb-3 sm:mb-9">
            <div className="flex flex-col gap-1 sm:gap-2">
              <Bone className="h-2.5 w-16 sm:w-20 rounded-full" />
              <div className="flex items-center gap-2">
                <Bone className="h-6 sm:h-7 w-28 sm:w-40 rounded-lg" />
                <Bone className="h-5 w-8 rounded-full" />
              </div>
            </div>
            <Bone className="h-4 w-10 sm:w-14 rounded-md" />
          </div>

          {/* Bento grid — 2 cols mobile, 4 cols desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Hero card */}
            <div className="sm:col-span-2 sm:row-span-2 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800 relative aspect-3/4 sm:aspect-auto sm:min-h-120">
              <Shimmer />
              <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 flex flex-col gap-2">
                <Bone className="h-3.5 sm:h-4 w-3/4 rounded-md" />
                <Bone className="h-3.5 sm:h-4 w-1/3 rounded-md" />
              </div>
            </div>
            {/* Standard cards */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <Shimmer />
                </div>
                <div className="px-3.5 py-3 flex flex-col gap-2">
                  <Bone className="h-3.5 w-5/6 rounded-md" />
                  <Bone className="h-3.5 w-2/5 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
