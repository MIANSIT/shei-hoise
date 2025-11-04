// components/skeletons/CheckoutPageSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";

export function CheckoutPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Skeleton */}
      <div className="hidden md:block">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side - Order Summary */}
            <div className="lg:col-span-2 space-y-6">
              {/* Checkout Header */}
              <div className="space-y-2">
                <SheiSkeleton className="h-8 w-48" />
                <SheiSkeleton className="h-4 w-64" />
              </div>

              {/* Shipping Address Section */}
              <div className="space-y-4">
                <SheiSkeleton className="h-6 w-40" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SheiSkeleton className="h-12 w-full" />
                  <SheiSkeleton className="h-12 w-full" />
                  <SheiSkeleton className="h-12 w-full" />
                  <SheiSkeleton className="h-12 w-full" />
                  <SheiSkeleton className="h-12 w-full md:col-span-2" />
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="space-y-4">
                <SheiSkeleton className="h-6 w-40" />
                <div className="space-y-3">
                  <SheiSkeleton className="h-16 w-full rounded-lg" />
                  <SheiSkeleton className="h-16 w-full rounded-lg" />
                </div>
              </div>

              {/* Order Items Section */}
              <div className="space-y-4">
                <SheiSkeleton className="h-6 w-40" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex gap-4 p-4 border rounded-lg">
                      <SheiSkeleton className="w-16 h-16 rounded-md" />
                      <div className="flex-1 space-y-2">
                        <SheiSkeleton className="h-4 w-32" />
                        <SheiSkeleton className="h-3 w-24" />
                        <SheiSkeleton className="h-3 w-20" />
                      </div>
                      <SheiSkeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side - Order Total */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                <div className="border rounded-lg p-6 space-y-4">
                  <SheiSkeleton className="h-6 w-32" />
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <SheiSkeleton className="h-4 w-20" />
                      <SheiSkeleton className="h-4 w-16" />
                    </div>
                    <div className="flex justify-between">
                      <SheiSkeleton className="h-4 w-16" />
                      <SheiSkeleton className="h-4 w-12" />
                    </div>
                    <div className="flex justify-between">
                      <SheiSkeleton className="h-4 w-24" />
                      <SheiSkeleton className="h-4 w-20" />
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between">
                        <SheiSkeleton className="h-5 w-20" />
                        <SheiSkeleton className="h-5 w-24" />
                      </div>
                    </div>
                  </div>
                  <SheiSkeleton className="h-12 w-full rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Skeleton */}
      <div className="block md:hidden">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <SheiSkeleton className="h-6 w-32" />
            <SheiSkeleton className="h-4 w-48" />
          </div>

          {/* Order Items */}
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex gap-3 p-3 border rounded-lg">
                <SheiSkeleton className="w-12 h-12 rounded-md" />
                <div className="flex-1 space-y-1">
                  <SheiSkeleton className="h-4 w-28" />
                  <SheiSkeleton className="h-3 w-20" />
                  <SheiSkeleton className="h-3 w-16" />
                </div>
                <SheiSkeleton className="h-5 w-12" />
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="border rounded-lg p-4 space-y-3">
            <SheiSkeleton className="h-5 w-24" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <SheiSkeleton className="h-4 w-16" />
                <SheiSkeleton className="h-4 w-12" />
              </div>
              <div className="flex justify-between">
                <SheiSkeleton className="h-4 w-20" />
                <SheiSkeleton className="h-4 w-10" />
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <SheiSkeleton className="h-5 w-16" />
                  <SheiSkeleton className="h-5 w-20" />
                </div>
              </div>
            </div>
            <SheiSkeleton className="h-12 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}