import Image from "next/image";
import { FC } from "react";
import mergeRefs from "../../../lib/hook/mergeMultipleRefs";
import { SwipeableHandlers } from "react-swipeable";

interface MainImageProps {
  src: string;
  alt?: string;
  discount?: number;
  swipeHandlers: SwipeableHandlers; // ✅ properly typed
}

const MainImage: FC<MainImageProps> = ({ src, alt, discount, swipeHandlers }) => {
  return (
    <div
      {...swipeHandlers}
      ref={mergeRefs(swipeHandlers.ref as React.Ref<HTMLDivElement>)}
      className="relative w-full rounded-xl overflow-hidden shadow-xl group"
    >
      {discount && (
        <span className="absolute top-3 left-3 bg-red-600 text-white text-sm sm:text-base px-3 py-1 rounded-md z-30 shadow-md">
          -{discount}%
        </span>
      )}

      <div className="overflow-hidden">
        <Image
          src={src}
          alt={alt || "Product Image"}
          width={1920}
          height={1080}
          className="w-full h-auto object-contain transition-transform duration-500 ease-in-out group-hover:scale-105"
          priority
        />
      </div>
    </div>
  );
};

export default MainImage;
