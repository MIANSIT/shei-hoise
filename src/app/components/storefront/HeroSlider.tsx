"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@/lib/types/heroSlide";

interface HeroSliderProps {
  slides: HeroSlide[];
}

const AUTOPLAY_MS = 5000;

/** Admin-managed marketing carousel. Callers must only pass slides that already have an image_url — a slide with no image is never valid to render. */
export function HeroSlider({ slides }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
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
    <section className="relative w-full aspect-16/5 min-h-64 overflow-hidden bg-muted">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100 z-[1]" : "opacity-0 pointer-events-none"}`}
        >
          <Image
            src={slide.image_url}
            alt={slide.headline ?? ""}
            fill
            priority={i === 0}
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-r from-black/65 via-black/30 to-black/5" />

          {(slide.headline || slide.subtext || (slide.button_text && slide.button_link)) && (
            <div className="relative z-[2] h-full flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-lg text-white">
                  {slide.headline && (
                    <h1 className="text-2xl sm:text-4xl font-black leading-tight drop-shadow-md">{slide.headline}</h1>
                  )}
                  {slide.subtext && (
                    <p className="mt-3 text-sm sm:text-base text-white/85 drop-shadow-sm">{slide.subtext}</p>
                  )}
                  {slide.button_text && slide.button_link && (
                    <Link
                      href={slide.button_link}
                      className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-primary text-primary-foreground shadow-lg hover:bg-primary-hover active:scale-95 transition-all duration-200"
                    >
                      {slide.button_text}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => move(-1)}
            className="absolute z-[3] top-1/2 left-4 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => move(1)}
            className="absolute z-[3] top-1/2 right-4 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute z-[3] bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
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
