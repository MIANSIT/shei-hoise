// components/skeletons/OrderCompleteSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";

export function OrderCompleteSkeleton() {
  return (
    <div className="text-center py-8 space-y-4">
      {/* Success icon and text */}
      <div className="flex items-center justify-center gap-3">
        <SheiSkeleton className="h-6 w-6 rounded-full" />
        <SheiSkeleton className="h-6 w-48" />
      </div>
      
      {/* Redirect text with arrow */}
      <div className="flex items-center justify-center gap-2">
        <SheiSkeleton className="h-4 w-32" />
        <SheiSkeleton className="h-4 w-4 rounded-full" />
      </div>
    </div>
  );
}