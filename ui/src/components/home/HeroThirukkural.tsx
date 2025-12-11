"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ThirukkuralDisplay } from "@/components/ThirukkuralDisplay";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { HeroEventBanner } from "@/components/home/HeroEventBanner";
import { useI18n } from "@/i18n/LanguageProvider";
import { useHeroContent } from "@/hooks/useHeroContent";

export function HeroThirukkural() {
  const { t } = useI18n();
  const { content, loading } = useHeroContent();
  const [showEvent, setShowEvent] = useState(true);

  // Auto-slide between event and thirukkural every 10 seconds
  useEffect(() => {
    if (!content || loading) return;

    const interval = setInterval(() => {
      setShowEvent((prev) => !prev);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [content, loading]);

  // If there's an active event banner, alternate between event and Thirukkural
  if (content && !loading) {
    return (
      <>
        <AnnouncementBanner />
        <div className="relative">
          {/* Slide indicators */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button
              onClick={() => setShowEvent(true)}
              className={`h-2 w-2 rounded-full transition-all ${
                showEvent ? 'bg-rose-600 w-6' : 'bg-gray-300'
              }`}
              aria-label="Show event banner"
            />
            <button
              onClick={() => setShowEvent(false)}
              className={`h-2 w-2 rounded-full transition-all ${
                !showEvent ? 'bg-orange-500 w-6' : 'bg-gray-300'
              }`}
              aria-label="Show Thirukkural"
            />
          </div>

          {/* Slider container */}
          <div className="relative overflow-hidden rounded-xl">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${showEvent ? 0 : 100}%)` }}
            >
              {/* Slide 1: Event Banner */}
              <div className="min-w-full">
                <HeroEventBanner content={content} />
              </div>

              {/* Slide 2: Thirukkural */}
              <div className="min-w-full">
                <ThirukkuralSection t={t} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Default: Show Thirukkural only
  return (
    <>
      <AnnouncementBanner />
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
