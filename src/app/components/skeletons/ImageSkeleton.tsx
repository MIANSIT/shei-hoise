// components/skeletons/ImageSkeleton.tsx
import { SheiSkeleton } from "../../components/ui/shei-skeleton";

interface ImageSkeletonProps {
  aspectRatio?: "square" | "video" | "portrait";
  className?: string;
}

export function ImageSkeleton({ 
  aspectRatio = "square", 
  className = "" 
}: ImageSkeletonProps) {
  const aspectRatios = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]"
  };

  return (
    <SheiSkeleton 
      className={`${aspectRatios[aspectRatio]} w-full ${className}`} 
    />
  );
}