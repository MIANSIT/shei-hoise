// components/skeletons/CustomOrderSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";
import { Card, CardContent, CardHeader } from "../../components/ui/SheiCard/SheiCard";

export function CustomOrderSkeleton() {
  return (
    <div className="h-full overflow-auto p-4 md:p-6 rounded-xl bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div className="space-y-2">
            <SheiSkeleton className="h-8 w-64" />
            <SheiSkeleton className="h-4 w-96" />
          </div>
        </div>

        {/* Main Card Skeleton */}
        <Card className="bg-card border-border">
          <CardHeader>
            <SheiSkeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product Search Skeleton */}
            <div className="space-y-3">
              <SheiSkeleton className="h-4 w-32" />
              <div className="flex gap-3">
                <SheiSkeleton className="h-10 flex-1" />
                <SheiSkeleton className="h-10 w-24" />
              </div>
            </div>

            {/* Products List Skeleton */}
            <div className="space-y-4">
              <SheiSkeleton className="h-5 w-40" />
              
              {/* Product Items Skeleton */}
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                  <SheiSkeleton className="w-12 h-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <SheiSkeleton className="h-4 w-48" />
                    <SheiSkeleton className="h-3 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <SheiSkeleton className="h-8 w-20 rounded-md" />
                    <SheiSkeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Products Skeleton */}
            <div className="space-y-4">
              <SheiSkeleton className="h-5 w-56" />
              
              {/* Selected Items Skeleton */}
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <SheiSkeleton className="w-10 h-10 rounded-md" />
                    <div className="space-y-1">
                      <SheiSkeleton className="h-4 w-36" />
                      <SheiSkeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <SheiSkeleton className="h-6 w-16" />
                    <SheiSkeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary Skeleton */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex justify-between">
                <SheiSkeleton className="h-4 w-20" />
                <SheiSkeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <SheiSkeleton className="h-4 w-16" />
                <SheiSkeleton className="h-4 w-12" />
              </div>
              <div className="flex justify-between pt-2">
                <SheiSkeleton className="h-5 w-24" />
                <SheiSkeleton className="h-5 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Divider Skeleton */}
        <SheiSkeleton className="w-full h-px" />

        {/* Generate Link Button Skeleton */}
        <div className="flex justify-end">
          <SheiSkeleton className="h-10 w-48 rounded-md" />
        </div>
      </div>
    </div>
  );
}