"use client";
import { useI18n } from "@/i18n/LanguageProvider";
import { useState, useEffect } from "react";

export function AnnouncementBanner() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative overflow-hidden bg-orange-600 py-3 shadow-md">
        <div className="flex whitespace-nowrap">
          <span className="mx-8 text-sm md:text-base font-medium text-white inline-block opacity-0">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  const message = t("announcement.construction");

  return (
    <div className="relative overflow-hidden bg-orange-600 py-3 shadow-md">
      <div className="flex">
        <div className="flex animate-marquee whitespace-nowrap">
          {Array(6).fill(null).map((_, i) => (
            <span key={i} className="mx-8 text-sm md:text-base font-medium text-white inline-block">
              {message}
            </span>
          ))}
        </div>
        <div className="flex animate-marquee whitespace-nowrap" aria-hidden="true">
          {Array(6).fill(null).map((_, i) => (
            <span key={i} className="mx-8 text-sm md:text-base font-medium text-white inline-block">
              {message}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

