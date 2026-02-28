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

const MainImage: FC<MainImageProps> = ({
  src,
  alt,
  discount,
  swipeHandlers,
}) => {
  const showDiscount = discount !== undefined && discount > 0;

  return (
    <div
      {...swipeHandlers}
      ref={mergeRefs(swipeHandlers.ref as React.Ref<HTMLDivElement>)}
      className="relative w-full rounded-xl overflow-hidden shadow-xl group"
    >
      {showDiscount && (
        <span className="absolute top-3 left-3 bg-red-600 text-white text-sm sm:text-base px-3 py-1 rounded-md z-30 shadow-md">
          -{discount}%
        </span>
      )}

      {/* Modern background for transparent images */}
      <div className="overflow-hidden bg-[radial-gradient(ellipse_at_center,#f8f8f8_0%,#ececec_100%)]">
        {/* Subtle grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none z-10"
          style={{
            backgroundImage:
              "linear-gradient(#888 1px, transparent 1px), linear-gradient(90deg, #888 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <Image
          src={src}
          alt={alt || "Product Image"}
          width={1920}
          height={1080}
          className="relative z-20 w-full h-auto object-contain transition-transform duration-500 ease-in-out group-hover:scale-105"
          priority
        />
      </div>
    </div>
  );
};

export default MainImage;
