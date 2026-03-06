import Image from "next/image";
import { FC } from "react";
import clsx from "clsx";

interface ThumbnailsProps {
  images: string[];
  mainIndex: number;
  onClick: (idx: number) => void;
  desktop?: boolean;
}

const Thumbnails: FC<ThumbnailsProps> = ({
  images,
  mainIndex,
  onClick,
  desktop = true,
}) => {
  if (!images || images.length <= 1) return null;

  const containerClass = desktop
    ? "hidden lg:flex flex-col gap-2"
    : "lg:hidden flex gap-2 overflow-x-auto mt-3 pb-1 snap-x snap-mandatory";

  return (
    <div className={containerClass}>
      {images.map((img, idx) => (
        <div
          key={idx}
          onClick={() => onClick(idx)}
          className={clsx(
            desktop ? "w-16 sm:w-18" : "shrink-0 w-16 sm:w-18",
            "aspect-square rounded-lg overflow-hidden cursor-pointer relative",
            // Same barely-visible fallback bg as MainImage
            "bg-[#f9f9f9] transition-all duration-200",
            idx === mainIndex
              ? "ring-2 ring-primary ring-offset-2 scale-105 shadow-md"
              : "opacity-70 hover:opacity-100 hover:scale-105 hover:shadow-sm",
            !desktop && "snap-start",
          )}
        >
          <Image
            src={img}
            alt={`Thumbnail ${idx + 1}`}
            fill
            className="object-contain p-1"
            loading={idx === 0 ? "eager" : "lazy"}
            sizes="72px"
          />
        </div>
      ))}
    </div>
  );
};

export default Thumbnails;
