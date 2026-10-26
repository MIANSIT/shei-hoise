"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroButtonPosition, HeroSlide } from "@/lib/types/heroSlide";

interface HeroSliderProps {
  slides: HeroSlide[];
  /** Used as the image alt when a slide has no headline of its own. */
  storeName: string;
}

const AUTOPLAY_MS = 5000;

// Flex alignment of the button inside the slide: items-* is vertical, justify-* horizontal.
const POSITION_CLASSES: Record<HeroButtonPosition, string> = {
  "top-left": "items-start justify-start",
  "top-center": "items-start justify-center",
  "top-right": "items-start justify-end",
  "middle-left": "items-center justify-start",
  "middle-center": "items-center justify-center",
  "middle-right": "items-center justify-end",
  "bottom-left": "items-end justify-start",
  "bottom-center": "items-end justify-center",
  "bottom-right": "items-end justify-end",
};

// Same alignments, scoped to sm and up. Literal strings so Tailwind can see them.
const SM_POSITION_CLASSES: Record<HeroButtonPosition, string> = {
  "top-left": "sm:items-start sm:justify-start",
  "top-center": "sm:items-start sm:justify-center",
  "top-right": "sm:items-start sm:justify-end",
  "middle-left": "sm:items-center sm:justify-start",
  "middle-center": "sm:items-center sm:justify-center",
  "middle-right": "sm:items-center sm:justify-end",
  "bottom-left": "sm:items-end sm:justify-start",
  "bottom-center": "sm:items-end sm:justify-center",
  "bottom-right": "sm:items-end sm:justify-end",
};

function HeroButton({ slide, className = "" }: { slide: HeroSlide; className?: string }) {
  const newTab = slide.button_new_tab;
  return (
    <Link
      href={slide.button_link ?? "#"}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${className} inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-6 sm:py-3 rounded-full font-bold text-xs sm:text-sm bg-primary text-primary-foreground shadow-lg hover:bg-primary-hover active:scale-95 transition-all duration-200`}
    >
      {slide.button_text}
    </Link>
  );
}

/** Admin-managed marketing carousel. Callers must only pass slides that already have an image_url — a slide with no image is never valid to render. */
export function HeroSlider({ slides, storeName }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  // Natural width/height per slide so phones can show the whole image instead of a cropped 16:5 strip.
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetAutoplay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (slides.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrent((c) => (c + 1) % slides.length);
      }, AUTOPLAY_MS);
    }
  };

  useEffect(() => {
    resetAutoplay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  if (slides.length === 0) return null;

  const goTo = (index: number) => {
    setCurrent(index);
    resetAutoplay();
  };
  const move = (dir: 1 | -1) => goTo((current + dir + slides.length) % slides.length);

  return (
    <section
      style={{ "--hero-ratio": ratios[slides[current].id] ?? 16 / 5 } as CSSProperties}
      className="relative w-full aspect-(--hero-ratio) sm:aspect-16/5 sm:min-h-64 overflow-hidden bg-muted"
    >
      {slides.map((slide, i) => {
        const hasButton = Boolean(slide.button_text && slide.button_link);
        const desktopPos = slide.button_position;
        // Phones fall back to the desktop position when no mobile one is set.
        const mobilePos = slide.button_position_mobile ?? slide.button_position;
        // The under-the-text button shows on any screen size that has no positioned button.
        const inlineClass = `mt-6 ${mobilePos ? "max-sm:hidden" : ""} ${desktopPos ? "sm:hidden" : ""}`;
        return (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100 z-1" : "opacity-0 pointer-events-none"}`}
        >
          <Image
            src={slide.image_url}
            alt={slide.headline || `${storeName} – featured offer ${i + 1}`}
            fill
            priority={i === 0}
            className="object-cover object-center"
            sizes="100vw"
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.currentTarget;
              if (!naturalWidth || !naturalHeight) return;
              setRatios((r) => (r[slide.id] ? r : { ...r, [slide.id]: naturalWidth / naturalHeight }));
            }}
          />
          {(slide.headline || slide.subtext) && (
            <div className="absolute inset-0 bg-linear-to-r from-black/65 via-black/30 to-black/5" />
          )}

          {(slide.headline || slide.subtext || (hasButton && !(mobilePos && desktopPos))) && (
            <div className="relative z-2 h-full flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-lg text-white">
                  {slide.headline && (
                    <p className="text-2xl sm:text-4xl font-black leading-tight drop-shadow-md">{slide.headline}</p>
                  )}
                  {slide.subtext && (
                    <p className="mt-3 text-sm sm:text-base text-white/85 drop-shadow-sm">{slide.subtext}</p>
                  )}
                  {hasButton && !(mobilePos && desktopPos) && <HeroButton slide={slide} className={inlineClass} />}
                </div>
              </div>
            </div>
          )}

          {hasButton && (mobilePos || desktopPos) && (
            <div
              className={`absolute inset-0 z-2 pointer-events-none flex px-12 sm:px-8 py-6 sm:py-12 ${
                mobilePos ? POSITION_CLASSES[mobilePos] : "max-sm:hidden"
              } ${desktopPos ? SM_POSITION_CLASSES[desktopPos] : "sm:hidden"}`}
            >
              <HeroButton slide={slide} className="pointer-events-auto" />
            </div>
          )}
        </div>
        );
      })}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => move(-1)}
            className="absolute z-3 top-1/2 left-2 sm:left-4 -translate-y-1/2 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => move(1)}
            className="absolute z-3 top-1/2 right-2 sm:right-4 -translate-y-1/2 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute z-3 bottom-2 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
