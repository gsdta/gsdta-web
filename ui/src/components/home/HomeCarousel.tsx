"use client";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { slides } from "@/data/home";

export function HomeCarousel() {
  const listRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = (i: number) => {
    const clamped = (i + slides.length) % slides.length;
    setIndex(clamped);
    const el = listRef.current?.children[clamped] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", inline: "center", block: "nearest" });
  };
  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);

  // Auto-advance carousel
  useEffect(() => {
    if (isPaused) return;

    const intervalId = setInterval(() => {
      goTo(index + 1);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(intervalId);
  }, [index, isPaused]);

  return (
    <section
      className="mx-auto max-w-6xl"
      role="region"
      aria-roledescription="carousel"
      aria-label="Highlights"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Highlights</h2>
      <div className="relative">
        <ul
          ref={listRef}
          className="-mx-4 flex overflow-x-auto scroll-px-4 snap-x snap-mandatory px-4 gap-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {slides.map((s, i) => (
            <li
              key={s.id}
              className="snap-center shrink-0 w-[90%] sm:w-[70%] md:w-[48%] lg:w-[32%]"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
            >
              <article className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full flex flex-col">
                <div className="relative aspect-[16/9]">
                  <Image src={s.image} alt={s.alt} fill className="object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{s.title}</h3>
                  {s.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{s.description}</p>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between">
          <button
            type="button"
            className="pointer-events-auto m-2 rounded-full bg-white/80 dark:bg-gray-800/80 p-2 shadow ring-1 ring-black/10 dark:ring-white/10 hover:bg-white dark:hover:bg-gray-800 transition-colors"
            aria-label="Previous slide"
            onClick={prev}
          >
            ◀
          </button>
          <button
            type="button"
            className="pointer-events-auto m-2 rounded-full bg-white/80 dark:bg-gray-800/80 p-2 shadow ring-1 ring-black/10 dark:ring-white/10 hover:bg-white dark:hover:bg-gray-800 transition-colors"
            aria-label="Next slide"
            onClick={next}
          >
            ▶
          </button>
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={index === i}
              className={`h-2 w-2 rounded-full transition-all ${index === i ? "bg-rose-600 w-8" : "bg-gray-300 dark:bg-gray-700"}`}
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
