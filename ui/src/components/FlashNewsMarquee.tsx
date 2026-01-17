"use client";

import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/i18n/LanguageProvider";

interface FlashNewsItem {
  id: string;
  text: { en: string; ta: string };
  isUrgent: boolean;
  priority: number;
  linkUrl?: string | null;
  linkText?: { en: string; ta: string } | null;
  backgroundColor?: string | null;
  textColor?: string | null;
}

interface FlashNewsResponse {
  success: boolean;
  data: {
    items: FlashNewsItem[];
  };
}

const CACHE_KEY = "flash_news";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

interface CachedData {
  items: FlashNewsItem[];
  timestamp: number;
}

export function FlashNewsMarquee() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<FlashNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFlashNews() {
      try {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { items: cachedItems, timestamp }: CachedData = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setItems(cachedItems);
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
        const res = await fetch(`${apiBase}/v1/flash-news`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch flash news");
        }

        const data: FlashNewsResponse = await res.json();

        if (data.success && data.data.items) {
          setItems(data.data.items);
          // Cache the result
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              items: data.data.items,
              timestamp: Date.now(),
            })
          );
        }
      } catch (err) {
        console.error("Error fetching flash news:", err);
        // On error, fall back to static announcement (items stays empty)
      } finally {
        setLoading(false);
      }
    }

    fetchFlashNews();
  }, []);

  // Build the marquee content
  const marqueeContent = useMemo(() => {
    if (items.length === 0) {
      // Fall back to static announcement
      return [{
        id: "static",
        text: t("announcement.welcome"),
        isUrgent: false,
        linkUrl: null as string | null,
        linkText: null as string | null,
      }];
    }

    return items.map((item) => ({
      id: item.id,
      text: lang === "ta" && item.text.ta ? item.text.ta : item.text.en,
      isUrgent: item.isUrgent,
      linkUrl: item.linkUrl || null,
      linkText: item.linkText
        ? lang === "ta" && item.linkText.ta
          ? item.linkText.ta
          : item.linkText.en
        : null,
    }));
  }, [items, lang, t]);

  // Check if any item is urgent (for faster animation)
  const hasUrgent = items.some((item) => item.isUrgent);

  // Determine background color (use first urgent item's color, or default blue)
  const urgentItem = items.find((item) => item.isUrgent);
  const bgColor = urgentItem?.backgroundColor || (hasUrgent ? "#dc2626" : "#2563eb");
  const textColor = urgentItem?.textColor || "#ffffff";

  // Loading state - show placeholder to prevent layout shift
  if (loading) {
    return (
      <div className="relative overflow-hidden bg-blue-600 py-3 shadow-md">
        <div className="flex whitespace-nowrap">
          <span className="mx-8 text-sm md:text-base font-medium text-white inline-block opacity-0">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  // Build message string for marquee
  const messageItems = marqueeContent.map((item) => (
    <span key={item.id} className="mx-8 text-sm md:text-base font-medium inline-block">
      {item.isUrgent && <span className="mr-1">⚠️</span>}
      {item.linkUrl ? (
        <a
          href={item.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {item.text}
          {item.linkText && <span className="ml-1">→ {item.linkText}</span>}
        </a>
      ) : (
        item.text
      )}
      <span className="mx-4 opacity-50">•</span>
    </span>
  ));

  return (
    <div
      className="relative overflow-hidden py-3 shadow-md"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="flex">
        <div
          className={`flex whitespace-nowrap ${
            hasUrgent ? "animate-marquee-fast" : "animate-marquee"
          }`}
        >
          {/* Repeat items multiple times for seamless scroll */}
          {Array(4)
            .fill(null)
            .map((_, i) => (
              <div key={i} className="flex">
                {messageItems}
              </div>
            ))}
        </div>
        <div
          className={`flex whitespace-nowrap ${
            hasUrgent ? "animate-marquee-fast" : "animate-marquee"
          }`}
          aria-hidden="true"
        >
          {Array(4)
            .fill(null)
            .map((_, i) => (
              <div key={i} className="flex">
                {messageItems}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
