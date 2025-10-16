"use client";
import { stats } from "@/data/home";

export function StatTiles() {
  return (
    <section aria-labelledby="stats-heading" className="mx-auto max-w-6xl">
      <h2 id="stats-heading" className="sr-only">Key statistics</h2>
      <div
        className="-mx-4 overflow-x-auto px-4"
        role="region"
        aria-roledescription="carousel"
        aria-label="Key statistics"
      >
        <ul className="flex gap-3 md:grid md:grid-cols-4 md:gap-4 scroll-px-4 snap-x snap-mandatory overflow-x-auto">
          {stats.map((s) => (
            <li
              key={s.id}
              className="min-w-[16rem] md:min-w-0 snap-start rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="text-base font-semibold text-gray-900">{s.title}</div>
              {s.subtitle && (
                <div className="mt-1 text-sm text-gray-600">{s.subtitle}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

