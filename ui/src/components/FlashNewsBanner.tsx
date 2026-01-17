'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/LanguageProvider';
import { getPublicFlashNews } from '@/lib/flash-news-api';
import type { FlashNewsPublic } from '@/types/flashNews';

export function FlashNewsBanner() {
  const { lang } = useI18n();
  const [items, setItems] = useState<FlashNewsPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const result = await getPublicFlashNews();
        setItems(result.items);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();

    // Refresh every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't render if loading, error, or no items
  if (loading || error || items.length === 0) {
    return null;
  }

  // Get text in current language, fallback to English
  const getText = (item: FlashNewsPublic) => {
    if (lang === 'ta' && item.text.ta) {
      return item.text.ta;
    }
    return item.text.en;
  };

  // Build the marquee content - each item separated by a bullet
  const marqueeItems = items.map((item, index) => (
    <span key={item.id} className="inline-flex items-center mx-8">
      {index > 0 && <span className="mx-4 text-amber-300">•</span>}
      {item.link ? (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm md:text-base font-medium text-white hover:text-amber-200 transition-colors"
        >
          {getText(item)}
        </a>
      ) : (
        <span className="text-sm md:text-base font-medium text-white">
          {getText(item)}
        </span>
      )}
    </span>
  ));

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 to-orange-600 py-2 shadow-md">
      <div className="animate-marquee flex whitespace-nowrap">
        {marqueeItems}
        {marqueeItems}
      </div>
    </div>
  );
}
