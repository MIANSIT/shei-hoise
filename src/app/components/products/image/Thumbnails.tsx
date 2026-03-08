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
    // padding on container so ring is never clipped
    <div className={clsx(containerClass, "p-1")}>
      {images.map((img, idx) => {
        const isActive = idx === mainIndex;
        return (
          <div
            key={idx}
            onClick={() => onClick(idx)}
            className={clsx(
              desktop
                ? "w-16 sm:w-18"
                : "shrink-0 w-16 sm:w-18 snap-start",
              "aspect-square rounded-xl overflow-hidden cursor-pointer relative transition-all duration-200",
              isActive
                ? "ring-2 ring-[#111] ring-offset-2 shadow-md opacity-100"
                : "opacity-50 hover:opacity-80 hover:ring-1 hover:ring-[#d1d5db] hover:ring-offset-1",
            )}
          >
            <Image
              src={img}
              alt={`Thumbnail ${idx + 1}`}
              fill
              className="object-cover"
              loading={idx === 0 ? "eager" : "lazy"}
              sizes="72px"
            />
          </div>
        );
      })}
    </div>
  );
};

export default Thumbnails;
