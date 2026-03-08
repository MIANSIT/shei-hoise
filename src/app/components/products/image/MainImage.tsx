"use client";
import Image from "next/image";
import { FC, useState } from "react";
import mergeRefs from "../../../../lib/hook/mergeMultipleRefs";
import { SwipeableHandlers } from "react-swipeable";
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MainImageProps {
  src: string;
  alt?: string;
  discount?: number;
  swipeHandlers: SwipeableHandlers;
  allImages?: string[];
  currentIndex?: number;
  onIndexChange?: (idx: number) => void;
}

const MainImage: FC<MainImageProps> = ({
  src,
  alt,
  discount,
  swipeHandlers,
  allImages,
  currentIndex = 0,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(currentIndex);

  const images = allImages && allImages.length > 0 ? allImages : [src];

  const openLightbox = () => {
    setLightboxIndex(currentIndex);
    setLightboxOpen(true);
  };

  const prev = () =>
    setLightboxIndex((i) => (i - 1 + images.length) % images.length);

  const next = () => setLightboxIndex((i) => (i + 1) % images.length);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "Escape") setLightboxOpen(false);
  };

  return (
    <>
      {/* ── Main image card ── */}
      <div
        {...swipeHandlers}
        ref={mergeRefs(swipeHandlers.ref as React.Ref<HTMLDivElement>)}
        className="relative w-full rounded-2xl overflow-hidden group cursor-zoom-in"
        onClick={openLightbox}
      >
        {/* Discount badge */}
        {discount && discount > 0 ? (
          <div className="absolute top-3 left-3 z-20 pointer-events-none">
            <span className="bg-[#e11d48] text-white text-[11px] font-bold px-3 py-1.5 rounded-full tracking-wide shadow-sm">
              -{discount}% OFF
            </span>
          </div>
        ) : null}

        {/* Image — taller aspect ratio, full coverage */}
        <div
          className="relative w-full bg-[#f5f5f5] rounded-2xl overflow-hidden"
          style={{ aspectRatio: "4/4.5" }}
        >
          <Image
            src={src}
            alt={alt || "Product Image"}
            fill
            className="object-contain p-4 transition-transform duration-500 ease-in-out group-hover:scale-105"
            priority
            sizes="(max-width: 768px) 100vw, 560px"
          />
        </div>

        {/* Zoom hint overlay */}
        <div className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <span className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-[#374151] text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm">
            <ZoomIn className="w-3.5 h-3.5" />
            Click to preview
          </span>
        </div>
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-9999 bg-black/85 backdrop-blur-md flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            {/* Close */}
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prev */}
            {images.length > 1 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="relative w-[min(90vw,640px)] h-[min(85vh,640px)]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[lightboxIndex]}
                alt={`${alt || "Product"} — image ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                priority
                sizes="640px"
              />
            </motion.div>

            {/* Next */}
            {images.length > 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Dot indicators */}
            {images.length > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(i);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === lightboxIndex
                        ? "bg-white scale-125"
                        : "bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Counter */}
            {images.length > 1 && (
              <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs font-medium">
                {lightboxIndex + 1} / {images.length}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MainImage;
