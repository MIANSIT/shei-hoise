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
    ? "hidden lg:flex flex-col gap-4"
    : "lg:hidden flex gap-3 overflow-x-auto mt-3 pb-1 snap-x snap-mandatory";

  return (
    <div className={containerClass}>
      {images.map((img, idx) => (
        <div
          key={idx}
          className={clsx(
            desktop
              ? "w-16 h-16 sm:w-20 sm:h-20"
              : "shrink-0 w-16 h-16 sm:w-20 sm:h-20",
            "rounded-lg overflow-hidden cursor-pointer relative transition-transform duration-300 shadow-sm",
            // Modern background for transparent images
            "bg-[radial-gradient(ellipse_at_center,#f8f8f8_0%,#ececec_100%)]",
            idx === mainIndex
              ? "scale-105 shadow-lg ring-2 ring-offset-1 ring-gray-400"
              : "hover:scale-110 hover:shadow-md",
            !desktop && "snap-start",
          )}
          onClick={() => onClick(idx)}
        >
          {idx === mainIndex && (
            <div className="absolute inset-0 rounded-lg overflow-hidden">
              <Image
                src={images[idx]}
                alt={`Blur background ${idx}`}
                fill
                className="object-contain w-full h-full blur-sm scale-105"
                priority={true}
              />
            </div>
          )}
          <div className="relative z-10 w-full h-full">
            <Image
              src={img}
              alt={`Thumbnail ${idx + 1}`}
              width={80}
              height={80}
              className="object-contain w-full h-full rounded-lg"
              loading={idx === 0 ? "eager" : "lazy"}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Thumbnails;
