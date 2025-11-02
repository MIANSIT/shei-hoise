// components/skeletons/DesktopCheckoutSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";
import { Card, CardContent, CardHeader } from "../../components/ui/SheiCard/SheiCard";

export function DesktopCheckoutSkeleton() {
  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <SheiSkeleton className="h-8 w-48 mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cart Items Card Skeleton */}
        <Card className="bg-card">
          <CardHeader>
            <SheiSkeleton className="h-6 w-40" />
            <SheiSkeleton className="h-1 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cart items list skeleton */}
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex gap-4 p-3 border rounded-lg">
                <SheiSkeleton className="w-16 h-16 rounded-md" />
                <div className="flex-1 space-y-2">
                  <SheiSkeleton className="h-4 w-32" />
                  <SheiSkeleton className="h-3 w-24" />
                  <SheiSkeleton className="h-3 w-20" />
                  <div className="flex gap-2">
                    <SheiSkeleton className="h-6 w-6 rounded-md" />
                    <SheiSkeleton className="h-6 w-6" />
                    <SheiSkeleton className="h-6 w-6 rounded-md" />
                  </div>
                </div>
                <SheiSkeleton className="h-5 w-16" />
              </div>
            ))}

            {/* Cart summary skeleton */}
            <div className="space-y-3 mt-4">
              <div className="flex justify-between">
                <SheiSkeleton className="h-4 w-20" />
                <SheiSkeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <SheiSkeleton className="h-4 w-16" />
                <SheiSkeleton className="h-4 w-12" />
              </div>
              <div className="flex justify-between pt-3">
                <SheiSkeleton className="h-5 w-12" />
                <SheiSkeleton className="h-5 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information Card Skeleton */}
        <Card className="bg-card">
          <CardHeader>
            <SheiSkeleton className="h-6 w-48" />
            <SheiSkeleton className="h-1 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Form fields skeleton */}
            <div className="space-y-3">
              <SheiSkeleton className="h-4 w-24" />
              <SheiSkeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <SheiSkeleton className="h-4 w-20" />
                <SheiSkeleton className="h-10 w-full" />
              </div>
              <div className="space-y-3">
                <SheiSkeleton className="h-4 w-24" />
                <SheiSkeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-3">
              <SheiSkeleton className="h-4 w-32" />
              <SheiSkeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-3">
                <SheiSkeleton className="h-4 w-16" />
                <SheiSkeleton className="h-10 w-full" />
              </div>
              <div className="space-y-3">
                <SheiSkeleton className="h-4 w-12" />
                <SheiSkeleton className="h-10 w-full" />
              </div>
              <div className="space-y-3">
                <SheiSkeleton className="h-4 w-20" />
                <SheiSkeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-3">
              <SheiSkeleton className="h-4 w-36" />
              <SheiSkeleton className="h-10 w-full" />
            </div>
            <SheiSkeleton className="h-12 w-full mt-6" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}