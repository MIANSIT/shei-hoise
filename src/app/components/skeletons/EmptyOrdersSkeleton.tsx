// components/skeletons/EmptyOrdersSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";
import { Card, CardContent } from "../../components/ui/SheiCard/SheiCard";

export function EmptyOrdersSkeleton() {
  return (
    <Card className="rounded-lg shadow-sm border border-border p-8 text-center">
      <div className="max-w-md mx-auto">
        {/* Icon Skeleton */}
        <SheiSkeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
        
        {/* Text Skeletons */}
        <SheiSkeleton className="h-6 w-32 mx-auto mb-2" />
        <SheiSkeleton className="h-4 w-48 mx-auto mb-4" />
        
        {/* Button Skeleton */}
        <SheiSkeleton className="h-10 w-32 mx-auto rounded-md" />
      </div>
    </Card>
  );
}