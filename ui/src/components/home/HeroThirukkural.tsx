"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ThirukkuralDisplay } from "@/components/ThirukkuralDisplay";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { FlashNewsBanner } from "@/components/FlashNewsBanner";
import { HeroEventBanner } from "@/components/home/HeroEventBanner";
import { useI18n } from "@/i18n/LanguageProvider";
import { useHeroContent } from "@/hooks/useHeroContent";

// Base interval for rotation (higher priority items get shorter intervals)
const BASE_INTERVAL_MS = 8000;

export function HeroThirukkural() {
  const { t } = useI18n();
  const { contents, loading } = useHeroContent();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Total slides = all events + 1 for Thirukkural
  const totalSlides = contents.length + 1;
  const thirukkuralIndex = contents.length; // Last slide is always Thirukkural

  // Calculate interval based on priority (higher priority = longer display time)
  const getIntervalForSlide = useCallback(
    (slideIndex: number) => {
      if (slideIndex >= contents.length) {
        // Thirukkural gets base interval
        return BASE_INTERVAL_MS;
      }
      const content = contents[slideIndex];
      // Higher priority (e.g., 100) = longer display time
      // Priority 10 = 8s, Priority 50 = 12s, Priority 100 = 16s
      const priorityMultiplier = 1 + (content.priority || 10) / 50;
      return Math.round(BASE_INTERVAL_MS * priorityMultiplier);
    },
    [contents]
  );

  // Auto-rotate through all slides
  useEffect(() => {
    if (contents.length === 0 || loading) return;

    const interval = getIntervalForSlide(currentSlide);

    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, interval);

    return () => clearTimeout(timer);
  }, [contents.length, loading, currentSlide, totalSlides, getIntervalForSlide]);

  // If there are active event banners, show carousel with all events + Thirukkural
  if (contents.length > 0 && !loading) {
    return (
      <>
        <AnnouncementBanner />
        <FlashNewsBanner />
        <div className="relative">
          {/* Slide indicators */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            {contents.map((_, index) => (
              <button
                key={`event-${index}`}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  currentSlide === index ? 'bg-rose-600 w-6' : 'bg-gray-300 w-2'
                }`}
                aria-label={`Show event ${index + 1}`}
              />
            ))}
            <button
              onClick={() => setCurrentSlide(thirukkuralIndex)}
              className={`h-2 rounded-full transition-all ${
                currentSlide === thirukkuralIndex ? 'bg-orange-500 w-6' : 'bg-gray-300 w-2'
              }`}
              aria-label="Show Thirukkural"
            />
          </div>

          {/* Slider container */}
          <div className="relative overflow-hidden rounded-xl">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {/* Event Slides */}
              {contents.map((content, index) => (
                <div key={content.id || index} className="min-w-full">
                  <HeroEventBanner content={content} />
                </div>
              ))}

              {/* Thirukkural Slide (always last) */}
              <div className="min-w-full">
                <ThirukkuralSection t={t} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Default: Show Thirukkural only (no events)
  return (
    <>
      <AnnouncementBanner />
      <FlashNewsBanner />
      <ThirukkuralSection t={t} />
    </>
  );
}

// Extract Thirukkural section as a separate component
function ThirukkuralSection({ t }: { t: (key: string) => string }) {
  return (
    <section className="relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 ring-1 ring-black/5">
      <div className="px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-4xl">
          {/* Subtitle + Motto inside hero */}
          <div className="text-center">
            <p className="text-[12px] md:text-sm text-gray-500">
              {t("flashcards.card4")}
            </p>
            <h2 className="mt-2 text-xl md:text-2xl font-semibold text-gray-900">
              {t("motto.title")}
            </h2>
            <span className="mt-2 inline-block h-0.5 w-14 bg-orange-500 rounded" />
          </div>

          <div className="mt-6 flex flex-col lg:flex-row items-center justify-center gap-8">
            <Link href="/" aria-label="Go to Home" className="flex-shrink-0">
              <div className="relative">
                <Image
                  src="/images/logo.png"
                  alt="GSDTA logo"
                  width={180}
                  height={180}
                  className="drop-shadow-lg"
                  priority
                />
                <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-800/40 text-xs px-2 py-1 rounded-full font-medium">
                  {t("brand.short")}
                </div>
              </div>
            </Link>
            <div className="flex-1 max-w-2xl">
              <ThirukkuralDisplay
                intervalMs={8000}
                className="bg-white/60 backdrop-blur-sm rounded-lg p-6 shadow-sm border border-white/40"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
