// components/skeletons/ButtonSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";

interface ButtonSkeletonProps {
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function ButtonSkeleton({ size = "md", fullWidth = false }: ButtonSkeletonProps) {
  const sizes = {
    sm: "h-8",
    md: "h-10",
    lg: "h-12"
  };

  return (
    <SheiSkeleton 
      className={`${sizes[size]} ${fullWidth ? 'w-full' : 'w-24'} rounded-md`} 
    />
  );
}