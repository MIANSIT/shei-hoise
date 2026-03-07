import Image from "next/image";
import { FC } from "react";
import mergeRefs from "../../../../lib/hook/mergeMultipleRefs";
import { SwipeableHandlers } from "react-swipeable";

interface MainImageProps {
  src: string;
  alt?: string;
  discount?: number;
  swipeHandlers: SwipeableHandlers;
}

const MainImage: FC<MainImageProps> = ({ src, alt, discount, swipeHandlers }) => {
  const showDiscount = discount !== undefined && discount > 0;

  return (
    <div
      {...swipeHandlers}
      ref={mergeRefs(swipeHandlers.ref as React.Ref<HTMLDivElement>)}
      className="relative w-full rounded-xl overflow-hidden shadow-md group"
    >
      {showDiscount && (
        <span className="absolute top-3 left-3 bg-red-600 text-white text-sm px-3 py-1 rounded-md z-30 shadow-md">
          -{discount}%
        </span>
      )}

      {/* Fixed height container — not full width, not aspect-square tall */}
      <div className="relative w-full h-105 bg-[#f9f9f9] rounded-xl overflow-hidden">
        <Image
          src={src}
          alt={alt || "Product Image"}
          fill
          className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
          priority
          sizes="(max-width: 768px) 100vw, 500px"
        />
      </div>
    </div>
  );
};

export default MainImage;