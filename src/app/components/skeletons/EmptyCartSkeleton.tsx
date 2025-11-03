// components/skeletons/EmptyCartSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";

export function EmptyCartSkeleton() {
  return (
    <div className="text-center py-8 space-y-3">
      <SheiSkeleton className="h-6 w-48 mx-auto" />
      <SheiSkeleton className="h-4 w-64 mx-auto" />
    </div>
  );
}