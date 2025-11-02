// components/skeletons/ProductPageSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";

export function ProductPageSkeleton() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      {/* Back button skeleton */}
      <div className="mb-6">
        <SheiSkeleton className="h-6 w-32" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start mt-6">
        {/* Image section skeleton */}
        <div className="w-full">
          <SheiSkeleton className="w-full h-96 rounded-lg" />
        </div>

        {/* Content section skeleton */}
        <div className="flex flex-col justify-start w-full space-y-6">
          {/* Title and category */}
          <div className="space-y-2">
            <SheiSkeleton className="h-8 w-3/4" />
            <SheiSkeleton className="h-4 w-20" />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <SheiSkeleton className="h-6 w-24" />
            <SheiSkeleton className="h-4 w-16" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <SheiSkeleton className="h-4 w-full" />
            <SheiSkeleton className="h-4 w-4/5" />
            <SheiSkeleton className="h-4 w-3/4" />
          </div>

          {/* Variants skeleton */}
          <div className="space-y-3">
            <SheiSkeleton className="h-4 w-32" />
            <div className="flex flex-wrap gap-2">
              <SheiSkeleton className="h-8 w-20 rounded-md" />
              <SheiSkeleton className="h-8 w-24 rounded-md" />
              <SheiSkeleton className="h-8 w-28 rounded-md" />
            </div>
          </div>

          {/* Stock badge */}
          <SheiSkeleton className="h-6 w-24 rounded-full" />

          {/* Quantity and add to cart */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <SheiSkeleton className="h-4 w-16" />
              <div className="flex items-center gap-2">
                <SheiSkeleton className="h-10 w-10 rounded-md" />
                <SheiSkeleton className="h-6 w-6" />
                <SheiSkeleton className="h-10 w-10 rounded-md" />
              </div>
              <SheiSkeleton className="h-6 w-20" />
            </div>
            <SheiSkeleton className="h-12 w-40 rounded-md" />
          </div>
        </div>
      </div>

      {/* Product details skeleton */}
      <div className="mt-12 space-y-4">
        <SheiSkeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <SheiSkeleton className="h-5 w-32" />
            <div className="space-y-2">
              <SheiSkeleton className="h-4 w-full" />
              <SheiSkeleton className="h-4 w-3/4" />
              <SheiSkeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="space-y-3">
            <SheiSkeleton className="h-5 w-32" />
            <div className="space-y-2">
              <SheiSkeleton className="h-4 w-full" />
              <SheiSkeleton className="h-4 w-3/4" />
              <SheiSkeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}