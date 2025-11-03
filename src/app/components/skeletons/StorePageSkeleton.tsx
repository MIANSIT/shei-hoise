// components/skeletons/StorePageSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";
import { ProductGridSkeleton } from "./ProductGridSkeleton";

export function StorePageSkeleton() {
  return (
    <div className="px-8 py-4">
      {/* Store header skeleton */}
      <div className="flex flex-col gap-4 mb-8">
        <SheiSkeleton className="h-8 w-64" />
        <SheiSkeleton className="h-4 w-48" />
      </div>

      {/* Product grid skeleton */}
      <ProductGridSkeleton count={10} />
    </div>
  );
}