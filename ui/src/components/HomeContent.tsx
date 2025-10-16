"use client";
import { HeroThirukkural } from "@/components/home/HeroThirukkural";
import { StatTiles } from "@/components/home/StatTiles";
import { HomeCarousel } from "@/components/home/HomeCarousel";

export function HomeContent() {
    return (
        <div className="space-y-16">
            <h1 className="sr-only">GSDTA Tamil School</h1>
            <HeroThirukkural/>
            <StatTiles/>
            <HomeCarousel/>
        </div>
    );
}
