"use client";
import { HeroThirukkural } from "@/components/home/HeroThirukkural";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import { FlashNewsMarquee } from "@/components/home/FlashNewsMarquee";
import { useI18n } from "@/i18n/LanguageProvider";

export function HomeContent() {
  const { t } = useI18n();
  return (
    <div className="space-y-12">
      <h1 className="sr-only">{t("brand.full")}</h1>
      <FlashNewsMarquee />
      <HeroThirukkural />
      <HomeCarousel />
    </div>
  );
}
