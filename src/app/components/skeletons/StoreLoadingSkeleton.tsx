// components/skeletons/StoreLoadingSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";

export function StoreLoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <SheiSkeleton className="h-8 w-8 rounded-full mx-auto" />
        <SheiSkeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  );
}