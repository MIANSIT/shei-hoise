"use client";
import Image from "next/image";
import { FC, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useProductImage } from "../../../../lib/hook/useProductImage";

interface ProductImageProps {
  images: string[];
  basePrice: number;
  discountedPrice?: number | null;
  alt?: string;
}

const ProductImage: FC<ProductImageProps> = ({
  images,
  alt,
  basePrice,
  discountedPrice,
}) => {
  const { mainIndex, handleThumbnailClick, swipeHandlers } = useProductImage({
    images,
  });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const discountPercent =
    discountedPrice && discountedPrice > 0 && discountedPrice < basePrice
      ? Math.round(((basePrice - discountedPrice) / basePrice) * 100)
      : 0;

  const openLightbox = (idx: number) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  const lbPrev = useCallback(
    () => setLightboxIndex((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );

  const lbNext = useCallback(
    () => setLightboxIndex((i) => (i + 1) % images.length),
    [images.length],
  );

  // Lock body scroll when lightbox open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") lbPrev();
      if (e.key === "ArrowRight") lbNext();
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, lbPrev, lbNext]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square rounded-2xl bg-[#f5f5f5] flex items-center justify-center text-[#9ca3af] text-sm">
        No image available
      </div>
    );
  }

  return (
    <>
      {/* ─── Image gallery ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Main image */}
        <div
          {...swipeHandlers}
          className="relative w-full rounded-2xl overflow-hidden cursor-zoom-in group"
          style={{ aspectRatio: "4 / 3" }}
          onClick={() => openLightbox(mainIndex)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mainIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0"
            >
              <Image
                src={images[mainIndex]}
                alt={alt || "Product"}
                fill
                className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                priority
                sizes="(max-width: 768px) 100vw, 560px"
              />
            </motion.div>
          </AnimatePresence>

          {/* Discount badge */}
          {discountPercent > 0 && (
            <div className="absolute top-3 left-3 z-10 pointer-events-none">
              <span className="bg-[#e11d48] text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm tracking-wide">
                -{discountPercent}% OFF
              </span>
            </div>
          )}

          {/* Zoom hint */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <span className="flex items-center gap-1 bg-black/60 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-full backdrop-blur-sm">
              <ZoomIn className="w-3 h-3" />
              Preview
            </span>
          </div>

          {/* Image counter (when multiple) */}
          {images.length > 1 && (
            <div className="absolute top-3 right-3 bg-black/40 text-white text-[11px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm pointer-events-none">
              {mainIndex + 1}/{images.length}
            </div>
          )}
        </div>

        {/* Thumbnail strip — horizontal, below main image */}
        {images.length > 1 && (
          <div className="flex gap-2 pb-1 scrollbar-hide">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => handleThumbnailClick(idx)}
                className={[
                  "relative shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all duration-200",
                  idx === mainIndex
                    ? "ring-2 ring-[#111] ring-offset-2 opacity-100"
                    : "opacity-50 hover:opacity-80 hover:ring-1 hover:ring-[#e5e7eb] hover:ring-offset-1",
                ].join(" ")}
              >
                <Image
                  src={img}
                  alt={`View ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Lightbox — rendered via portal directly on body ── */}
      {lightboxOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99999,
                background: "rgba(0,0,0,0.95)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => setLightboxOpen(false)}
            >
              {/* Close */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(false);
                }}
                style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Counter */}
              <span
                style={{
                  position: "absolute",
                  top: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
                className="text-white/50 text-xs font-medium pointer-events-none"
              >
                {lightboxIndex + 1} / {images.length}
              </span>

              {/* Prev */}
              {images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    lbPrev();
                  }}
                  style={{
                    position: "absolute",
                    left: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 10,
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Main image */}
              <motion.div
                key={lightboxIndex}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="relative"
                style={{
                  width: "min(90vw, 720px)",
                  height: "min(88vh, 720px)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={images[lightboxIndex]}
                  alt={`${alt || "Product"} — ${lightboxIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="720px"
                  priority
                />
              </motion.div>

              {/* Next */}
              {images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    lbNext();
                  }}
                  style={{
                    position: "absolute",
                    right: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 10,
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 20,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                  className="flex gap-2"
                >
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(i);
                      }}
                      className={[
                        "relative w-12 h-12 rounded-lg overflow-hidden transition-all duration-200",
                        i === lightboxIndex
                          ? "ring-2 ring-white opacity-100 scale-110"
                          : "opacity-40 hover:opacity-70",
                      ].join(" ")}
                    >
                      <Image
                        src={img}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

export default ProductImage;
