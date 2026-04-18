// Skeleton that mirrors the store home page layout:
// banner → identity bar → category tabs → bento grid (1 hero + 4 standard)
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
    <div className="min-h-screen bg-white dark:bg-gray-950 animate-pulse">

      {/* ── Banner ── */}
      <div className="relative w-full h-64 sm:h-80 lg:h-110 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <Shimmer />

        {/* Identity bar at banner bottom */}
        <div className="absolute bottom-0 inset-x-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-5 flex items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bone className="w-13 h-13 rounded-xl shrink-0" />
              <div className="flex flex-col gap-2">
                <Bone className="h-5 w-36 rounded-md" />
                <Bone className="h-3 w-52 rounded-md" />
              </div>
            </div>
            <Bone className="h-10 w-28 rounded-full shrink-0" />
          </div>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 py-1 overflow-hidden">
            {[40, 64, 56, 72, 48, 60].map((w, i) => (
              <Bone key={i} className="h-10 rounded-none mx-2" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Section label ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bone className="w-4 h-4 rounded-sm" />
          <Bone className="h-4 w-28 rounded-md" />
          <Bone className="h-3 w-12 rounded-md" />
        </div>
        <Bone className="h-3 w-14 rounded-md" />
      </div>

      {/* ── Bento grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">

          {/* Hero card */}
          <div className="sm:col-span-2 sm:row-span-2 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative aspect-3/4 sm:min-h-120">
            <Shimmer />
            {/* Fake name + price at bottom */}
            <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col gap-2">
              <Bone className="h-4 w-3/4 rounded-md" />
              <Bone className="h-4 w-1/3 rounded-md" />
            </div>
          </div>

          {/* 4 standard cards */}
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex flex-col">
              <div className="relative aspect-square overflow-hidden">
                <Shimmer />
              </div>
              <div className="p-3 flex flex-col gap-2 bg-white dark:bg-gray-900">
                <Bone className="h-3.5 w-4/5 rounded-md" />
                <Bone className="h-3.5 w-2/5 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
