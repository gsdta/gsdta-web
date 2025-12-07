"use client";
import { useI18n } from "@/i18n/LanguageProvider";
import { useState, useEffect } from "react";

const flashcardKeys = [
  "flashcards.card1",
  "flashcards.card2",
  "flashcards.card3",
  "flashcards.card4",
];

export function Flashcards() {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcardKeys.length);
    }, 4000); // Change card every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full py-4">
      <div className="mx-auto max-w-6xl px-4">
        {/* Desktop: Show all cards in a simple text layout */}
        <div className="hidden md:block">
          <div className="text-center space-y-2">
            {flashcardKeys.map((key) => (
              <p key={key} className="text-gray-600 text-sm">
                {t(key)}
              </p>
            ))}
          </div>
        </div>

        {/* Mobile: Show rotating single text */}
        <div className="md:hidden">
          <p className="text-center text-gray-600 text-sm min-h-[60px] flex items-center justify-center">
            {t(flashcardKeys[currentIndex])}
          </p>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-3">
            {flashcardKeys.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === currentIndex
                    ? "bg-orange-500"
                    : "bg-gray-300"
                }`}
                aria-label={`Go to card ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
