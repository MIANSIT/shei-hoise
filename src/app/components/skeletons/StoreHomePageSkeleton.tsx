// Skeleton that mirrors the store home page layout:
// banner → identity bar → category card grid → featured bento grid
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

      {/* ── Banner ── */}
      <div className="relative w-full h-72 sm:h-96 lg:h-120 bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <Shimmer />

        {/* Identity overlay at banner bottom */}
        <div className="absolute bottom-0 inset-x-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-7 flex items-end justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Bone className="w-14 h-14 rounded-2xl shrink-0" />
              <div className="flex flex-col gap-2">
                <Bone className="h-5 w-36 rounded-md" />
                <Bone className="h-3 w-48 rounded-md" />
              </div>
            </div>
            <Bone className="h-10 w-28 rounded-full shrink-0" />
          </div>
        </div>
      </div>

      {/* ── Shop by Category section ── */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

          {/* Section header */}
          <div className="flex items-end justify-between mb-8 sm:mb-10">
            <div className="flex flex-col gap-2">
              <Bone className="h-2.5 w-24 rounded-full" />
              <Bone className="h-7 w-48 rounded-lg" />
            </div>
            <Bone className="h-4 w-16 rounded-md hidden sm:block" />
          </div>

          {/* Category card grid — 2 cols mobile, 3 sm, 6 lg */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden"
              >
                <div className="h-0.5 bg-gray-100 dark:bg-gray-800" />
                <div className="flex flex-col items-center gap-3 px-3 py-6 sm:py-7">
                  <Bone className="w-11 h-11 rounded-xl" />
                  <Bone className="h-3.5 w-3/4 rounded-md" />
                  <Bone className="h-2.5 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Featured Products section ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 sm:pt-16">

        {/* Section header */}
        <div className="flex items-end justify-between mb-7 sm:mb-9">
          <div className="flex flex-col gap-2">
            <Bone className="h-2.5 w-20 rounded-full" />
            <div className="flex items-center gap-2.5">
              <Bone className="h-7 w-40 rounded-lg" />
              <Bone className="h-6 w-10 rounded-full hidden sm:block" />
            </div>
          </div>
          <Bone className="h-4 w-14 rounded-md" />
        </div>

        {/* Bento grid — hero + 4 standard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">

          {/* Hero card */}
          <div className="sm:col-span-2 sm:row-span-2 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800 relative aspect-3/4 sm:min-h-120">
            <Shimmer />
            <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 flex flex-col gap-2">
              <Bone className="h-4 w-3/4 rounded-md" />
              <Bone className="h-4 w-1/3 rounded-md" />
            </div>
          </div>

          {/* 4 standard cards */}
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
  );
}
