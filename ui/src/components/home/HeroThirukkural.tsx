"use client";
import Link from "next/link";
import Image from "next/image";
import { ThirukkuralDisplay } from "@/components/ThirukkuralDisplay";

export function HeroThirukkural() {
  return (
    <section className="relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 dark:from-gray-900 dark:via-gray-950 dark:to-black ring-1 ring-black/5 dark:ring-white/5 px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
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
              <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 text-xs px-2 py-1 rounded-full font-medium">
                GSDTA
              </div>
            </div>
          </Link>
          <div className="flex-1 max-w-lg">
            <ThirukkuralDisplay
              intervalMs={8000}
              className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-lg p-6 shadow-sm border border-white/40 dark:border-white/10"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
