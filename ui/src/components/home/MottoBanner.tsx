"use client";
import { useI18n } from "@/i18n/LanguageProvider";
import { useEffect, useState } from "react";

const subtitleKeys = [
  "flashcards.card1",
  "flashcards.card2",
  "flashcards.card3",
  "flashcards.card4",
];

export function MottoBanner() {
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % subtitleKeys.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="w-full py-4">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="text-[12px] md:text-sm text-gray-500 dark:text-gray-400">
          {t(subtitleKeys[idx])}
        </p>
        <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100">
          {t("motto.title")}
        </h2>
        <span className="mt-2 inline-block h-0.5 w-14 bg-orange-500 rounded" />
      </div>
    </section>
  );
}
