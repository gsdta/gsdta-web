"use client";
import { HeroThirukkural } from "@/components/home/HeroThirukkural";
import { HomeCarousel } from "@/components/home/HomeCarousel";

export function HomeContent() {
  return (
    <div className="space-y-12">
      <h1 className="sr-only">Greater San Diego Tamil Academy</h1>
      <HeroThirukkural />
      <HomeCarousel />
    </div>
  );
}
