'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/LanguageProvider';

interface BilingualText {
  en: string;
  ta: string;
}

interface FlashNewsItem {
  id: string;
  text: BilingualText;
  linkUrl?: string | null;
  linkText?: BilingualText | null;
  isUrgent: boolean;
}

interface FlashNewsResponse {
  success: boolean;
  data: {
    items: FlashNewsItem[];
  };
}

const CACHE_KEY = 'flash_news_cache';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

interface CachedData {
  items: FlashNewsItem[];
  timestamp: number;
}

export function FlashNewsMarquee() {
  const { lang } = useI18n();
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

        // Fetch from API
        const res = await fetch('/api/v1/flash-news');
        if (!res.ok) throw new Error('Failed to fetch');
        
        const data: FlashNewsResponse = await res.json();
        
        if (data.success && data.data.items) {
          setItems(data.data.items);
          
          // Cache the result
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            items: data.data.items,
            timestamp: Date.now(),
          }));
        }
      } catch (err) {
        console.error('Error fetching flash news:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFlashNews();
  }, []);

  // Don't render if no items or loading
  if (loading || items.length === 0) {
    return null;
  }

  // Get text based on current language
  const getText = (bilingual: BilingualText): string => {
    return lang === 'ta' ? bilingual.ta : bilingual.en;
  };

  return (
    <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white overflow-hidden">
      <div className="relative flex items-center h-10">
        {/* Label */}
        <div className="flex-shrink-0 bg-red-800 px-4 py-2 font-semibold text-sm z-10 shadow-lg">
          {lang === 'ta' ? 'செய்திகள்' : 'NEWS'}
        </div>

        {/* Marquee Container */}
        <div className="flex-1 overflow-hidden">
          <div className="marquee-container">
            <div className="marquee-content">
              {/* Duplicate items for seamless loop */}
              {[...items, ...items].map((item, index) => (
                <span key={`${item.id}-${index}`} className="inline-flex items-center mx-8">
                  {item.isUrgent && (
                    <span className="mr-2 animate-pulse">⚠️</span>
                  )}
                  <span className={item.isUrgent ? 'font-semibold' : ''}>
                    {getText(item.text)}
                  </span>
                  {item.linkUrl && item.linkText && (
                    <Link
                      href={item.linkUrl}
                      className="ml-2 underline hover:no-underline text-yellow-200"
                    >
                      {getText(item.linkText)}
                    </Link>
                  )}
                  <span className="mx-4 text-red-300">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CSS for marquee animation */}
      <style jsx>{`
        .marquee-container {
          display: flex;
          overflow: hidden;
          white-space: nowrap;
        }
        
        .marquee-content {
          display: inline-flex;
          animation: marquee 30s linear infinite;
        }
        
        .marquee-content:hover {
          animation-play-state: paused;
        }
        
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
