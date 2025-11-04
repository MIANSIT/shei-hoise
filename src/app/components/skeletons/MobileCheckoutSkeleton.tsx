// components/skeletons/MobileCheckoutSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";

export function MobileCheckoutSkeleton() {
  return (
    <div className="container mx-auto px-4 py-4">
      {/* Header and navigation */}
      <div className="flex items-center justify-between mb-4">
        <SheiSkeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <SheiSkeleton className="h-8 w-8 rounded-md" />
          <SheiSkeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

      {/* Progress bar */}
      <SheiSkeleton className="w-full h-1.5 rounded-full mb-6" />

      {/* Step content */}
      <div className="min-h-[40vh] space-y-4">
        {/* Step title */}
        <SheiSkeleton className="h-6 w-40" />

        {/* Cart items skeleton */}
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex gap-3 p-3 border rounded-lg">
            <SheiSkeleton className="w-12 h-12 rounded-md" />
            <div className="flex-1 space-y-1">
              <SheiSkeleton className="h-4 w-28" />
              <SheiSkeleton className="h-3 w-20" />
              <SheiSkeleton className="h-3 w-16" />
              <div className="flex gap-1">
                <SheiSkeleton className="h-6 w-6 rounded-md" />
                <SheiSkeleton className="h-6 w-6" />
                <SheiSkeleton className="h-6 w-6 rounded-md" />
              </div>
            </div>
            <SheiSkeleton className="h-5 w-12" />
          </div>
        ))}

        {/* Cart summary skeleton */}
        <div className="space-y-2 mt-4">
          <div className="flex justify-between">
            <SheiSkeleton className="h-4 w-16" />
            <SheiSkeleton className="h-4 w-12" />
          </div>
          <div className="flex justify-between">
            <SheiSkeleton className="h-4 w-20" />
            <SheiSkeleton className="h-4 w-10" />
          </div>
          <div className="flex justify-between pt-2">
            <SheiSkeleton className="h-5 w-12" />
            <SheiSkeleton className="h-5 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}