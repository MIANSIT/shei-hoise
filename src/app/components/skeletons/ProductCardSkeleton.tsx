// components/skeletons/ProductCardSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";
import { Card } from "../../components/ui/SheiCard/SheiCard";

export function ProductCardSkeleton() {
  return (
    <Card className="flex flex-col rounded-lg overflow-hidden shadow-sm p-0 bg-card border-border">
      {/* Image skeleton */}
      <div className="relative w-full h-80 overflow-hidden">
        <SheiSkeleton className="w-full h-full" />
      </div>

      {/* Content skeleton */}
      <div className="flex flex-col p-4 gap-3">
        {/* Category skeleton */}
        <SheiSkeleton className="h-4 w-20" />
        
        {/* Title skeleton */}
        <SheiSkeleton className="h-6 w-full" />
        
        {/* Price skeleton */}
        <div className="flex items-center justify-between">
          <SheiSkeleton className="h-5 w-24" />
          <SheiSkeleton className="h-5 w-12" />
        </div>
      </div>

      {/* Buttons skeleton */}
      <div className="flex gap-2 px-4 pb-4">
        <SheiSkeleton className="h-10 flex-1" />
        <SheiSkeleton className="h-10 flex-1" />
      </div>
    </Card>
  );
}