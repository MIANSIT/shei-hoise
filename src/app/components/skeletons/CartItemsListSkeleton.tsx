// components/skeletons/CartItemsListSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";

export function CartItemsListSkeleton() {
  return (
    <div className="space-y-3">
      {/* Store header skeleton */}
      <div className="flex justify-between items-center">
        <SheiSkeleton className="h-4 w-48" />
        <SheiSkeleton className="h-8 w-32" />
      </div>

      {/* Cart items skeletons */}
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between rounded-lg bg-card/50 p-3 border border-border">
          <div className="flex items-center gap-4">
            {/* Image skeleton */}
            <SheiSkeleton className="w-20 h-20 rounded-lg" />
            
            {/* Content skeleton */}
            <div className="flex flex-col space-y-2">
              {/* Product name */}
              <SheiSkeleton className="h-4 w-32" />
              
              {/* Variant details */}
              <SheiSkeleton className="h-3 w-24" />
              <SheiSkeleton className="h-3 w-20" />
              
              {/* Category */}
              <SheiSkeleton className="h-3 w-28" />
              
              {/* Price */}
              <SheiSkeleton className="h-3 w-20" />
              
              {/* Stock status */}
              <SheiSkeleton className="h-3 w-16" />
              
              {/* Quantity controls */}
              <div className="flex items-center gap-2 mt-2">
                <SheiSkeleton className="h-7 w-7 rounded-md" />
                <SheiSkeleton className="h-6 w-6" />
                <SheiSkeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          </div>

          {/* Right side actions and price */}
          <div className="flex items-end flex-col gap-8">
            <SheiSkeleton className="h-8 w-8 rounded-md" />
            <SheiSkeleton className="h-5 w-16" />
          </div>
        </div>
      ))}

      {/* Cart summary skeleton */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <SheiSkeleton className="h-4 w-20" />
          <SheiSkeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between">
          <SheiSkeleton className="h-4 w-16" />
          <SheiSkeleton className="h-4 w-12" />
        </div>
        <div className="flex justify-between">
          <SheiSkeleton className="h-5 w-24" />
          <SheiSkeleton className="h-5 w-20" />
        </div>
        <SheiSkeleton className="h-10 w-full mt-4" />
      </div>
    </div>
  );
}