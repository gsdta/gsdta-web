"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { slides } from "@/data/home";
import { useI18n } from "@/i18n/LanguageProvider";
import { CarouselStatsCard } from "./CarouselStatsCard";

export function HomeCarousel() {
  const listRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { t } = useI18n();

  const goTo = (i: number) => {
    const clamped = (i + slides.length) % slides.length;
    setIndex(clamped);
    const el = listRef.current?.children[clamped] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", inline: "center", block: "nearest" });
  };
  const prev = useCallback(() => goTo(index - 1), [index]);
  const next = useCallback(() => goTo(index + 1), [index]);

  // Auto-advance carousel
  useEffect(() => {
    if (isPaused) return;

    const intervalId = setInterval(() => {
      goTo(index + 1);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(intervalId);
  }, [index, isPaused]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(slides.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prev, next]);

  const getSlideIcon = (type?: string) => {
    switch (type) {
      case 'hero':
        return '🎓';
      case 'stats':
        return '📊';
      case 'programs':
        return '📚';
      case 'culture':
        return '🎭';
      case 'community':
        return '🤝';
      case 'success':
        return '⭐';
      case 'cta':
        return '✨';
      default:
        return '🔬';
    }
  };

  return (
    <section
      className="mx-auto max-w-6xl"
      role="region"
      aria-roledescription="carousel"
      aria-label={t("home.carousel.title")}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        {t("home.carousel.title")}
      </h2>
      <div className="relative">
        <ul
          ref={listRef}
          className="-mx-4 flex overflow-x-auto scroll-px-4 snap-x snap-mandatory px-4 gap-3 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {slides.map((s, i) => (
            <li
              key={s.id}
              className="snap-center shrink-0 w-[85%] sm:w-[60%] md:w-[45%] lg:w-[30%]"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
            >
              <article className={`rounded-lg border overflow-hidden h-full flex flex-col transition-all hover:shadow-lg min-h-[140px] ${
                s.type === 'hero' 
                  ? 'border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50' 
                  : s.type === 'cta'
                  ? 'border-rose-300 bg-gradient-to-br from-amber-50 to-rose-50'
                  : s.type === 'stats'
                  ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50'
                  : 'border-gray-200 bg-white'
              } shadow-sm`}>
                <div className="p-4 flex-1 flex flex-col justify-center">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl flex-shrink-0">{getSlideIcon(s.type)}</span>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-gray-900 ${
                        s.type === 'hero' ? 'text-base' : 'text-sm'
                      }`}>
                        {t(s.titleKey)}
                      </h3>
                      {s.descriptionKey && (
                        <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                          {t(s.descriptionKey)}
                        </p>
                      )}
                    </div>
                  </div>
                  {s.type === 'stats' && (
                    <div className="mt-2">
                      <CarouselStatsCard />
                    </div>
                  )}
                  {s.link && s.linkTextKey && (
                    <Link
                      href={s.link}
                      className={`mt-3 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        s.type === 'cta'
                          ? 'bg-rose-600 text-white hover:bg-rose-700:bg-rose-700'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200:bg-gray-700'
                      }`}
                    >
                      {t(s.linkTextKey)} →
                    </Link>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between">
          <button
            type="button"
            className="pointer-events-auto m-1 rounded-full bg-white/90/90 p-1.5 shadow-lg ring-1 ring-black/10/10 hover:bg-white:bg-gray-800 transition-all hover:scale-110"
            aria-label="Previous slide"
            onClick={prev}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            className="pointer-events-auto m-1 rounded-full bg-white/90/90 p-1.5 shadow-lg ring-1 ring-black/10/10 hover:bg-white:bg-gray-800 transition-all hover:scale-110"
            aria-label="Next slide"
            onClick={next}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="mt-2 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={index === i}
              className={`h-1.5 rounded-full transition-all ${
                index === i ? "bg-rose-600 w-6" : "bg-gray-300 w-1.5 hover:bg-gray-400:bg-gray-600"
              }`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
