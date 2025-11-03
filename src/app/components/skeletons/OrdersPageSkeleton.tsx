// components/skeletons/OrdersPageSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";
import { Card, CardContent, CardHeader } from "../../components/ui/SheiCard/SheiCard";

export function OrdersPageSkeleton() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8 space-y-2">
          <SheiSkeleton className="h-8 w-48" />
          <SheiSkeleton className="h-4 w-64" />
        </div>

        {/* Orders Table Skeleton */}
        <Card>
          <CardHeader>
            <SheiSkeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Table Header Skeleton */}
            <div className="grid grid-cols-12 gap-4 pb-4 border-b">
              <SheiSkeleton className="h-4 w-20 col-span-2" />
              <SheiSkeleton className="h-4 w-16 col-span-2" />
              <SheiSkeleton className="h-4 w-24 col-span-2" />
              <SheiSkeleton className="h-4 w-20 col-span-2" />
              <SheiSkeleton className="h-4 w-16 col-span-2" />
              <SheiSkeleton className="h-4 w-20 col-span-2" />
            </div>

            {/* Table Rows Skeleton */}
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 py-4 border-b last:border-b-0">
                <div className="col-span-2 space-y-2">
                  <SheiSkeleton className="h-4 w-16" />
                  <SheiSkeleton className="h-3 w-20" />
                </div>
                <div className="col-span-2 space-y-2">
                  <SheiSkeleton className="h-4 w-12" />
                  <SheiSkeleton className="h-3 w-16" />
                </div>
                <div className="col-span-2 space-y-2">
                  <SheiSkeleton className="h-4 w-20" />
                  <SheiSkeleton className="h-3 w-24" />
                </div>
                <div className="col-span-2">
                  <SheiSkeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="col-span-2">
                  <SheiSkeleton className="h-4 w-16" />
                </div>
                <div className="col-span-2">
                  <SheiSkeleton className="h-8 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}