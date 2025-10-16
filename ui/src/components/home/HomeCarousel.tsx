"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { slides } from "@/data/home";

export function HomeCarousel() {
  const listRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = (i: number) => {
    const clamped = (i + slides.length) % slides.length;
    setIndex(clamped);
    const el = listRef.current?.children[clamped] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", inline: "center", block: "nearest" });
  };
  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);

  return (
    <section
      className="mx-auto max-w-6xl"
      role="region"
      aria-roledescription="carousel"
      aria-label="Highlights"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-3">Highlights</h2>
      <div className="relative">
        <ul
          ref={listRef}
          className="-mx-4 flex overflow-x-auto scroll-px-4 snap-x snap-mandatory px-4 gap-4"
        >
          {slides.map((s, i) => (
            <li
              key={s.id}
              className="snap-center shrink-0 w-[90%] sm:w-[70%] md:w-[48%] lg:w-[32%]"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
            >
              <article className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden h-full flex flex-col">
                <div className="relative aspect-[16/9]">
                  <Image src={s.image} alt={s.alt} fill className="object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold text-gray-900">{s.title}</h3>
                  {s.description && (
                    <p className="mt-1 text-sm text-gray-600">{s.description}</p>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between">
          <button
            type="button"
            className="pointer-events-auto m-2 rounded-full bg-white/80 p-2 shadow ring-1 ring-black/10 hover:bg-white"
            aria-label="Previous slide"
            onClick={prev}
          >
            ◀
          </button>
          <button
            type="button"
            className="pointer-events-auto m-2 rounded-full bg-white/80 p-2 shadow ring-1 ring-black/10 hover:bg-white"
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
              className={`h-2 w-2 rounded-full ${index === i ? "bg-rose-600" : "bg-gray-300"}`}
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
