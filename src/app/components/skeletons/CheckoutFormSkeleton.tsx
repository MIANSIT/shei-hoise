// components/skeletons/CheckoutFormSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";
import { Card, CardContent, CardHeader } from "../ui/SheiCard/SheiCard";

export function CheckoutFormSkeleton() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <SheiSkeleton className="h-6 w-48" />
        <SheiSkeleton className="h-1 w-full" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Name Field */}
        <div className="space-y-2">
          <SheiSkeleton className="h-4 w-20" />
          <SheiSkeleton className="h-10 w-full" />
        </div>

        {/* Email and Phone Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SheiSkeleton className="h-4 w-12" />
            <SheiSkeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <SheiSkeleton className="h-4 w-24" />
            <SheiSkeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Password Field (for guest users) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SheiSkeleton className="h-4 w-32" />
            <SheiSkeleton className="h-4 w-36" />
          </div>
          <div className="relative">
            <SheiSkeleton className="h-10 w-full" />
          </div>
          <SheiSkeleton className="h-3 w-64" />
        </div>

        {/* Address Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <SheiSkeleton className="h-4 w-16" />
            <SheiSkeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <SheiSkeleton className="h-4 w-12" />
            <SheiSkeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <SheiSkeleton className="h-4 w-20" />
            <SheiSkeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Shipping Address */}
        <div className="space-y-2">
          <SheiSkeleton className="h-4 w-32" />
          <SheiSkeleton className="h-10 w-full" />
        </div>

        {/* Submit Button */}
        <SheiSkeleton className="h-12 w-full mt-6" />
      </CardContent>
    </Card>
  );
}