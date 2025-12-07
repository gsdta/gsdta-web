'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useI18n } from '@/i18n/LanguageProvider';
import type { HeroContent } from '@/types/heroContent';

interface HeroEventBannerProps {
  content: HeroContent;
}

export function HeroEventBanner({ content }: HeroEventBannerProps) {
  const { lang } = useI18n();

  const title = content.title[lang] || content.title.en;
  const subtitle = content.subtitle[lang] || content.subtitle.en;
  const description = content.description?.[lang] || content.description?.en;
  const ctaText = content.ctaText?.[lang] || content.ctaText?.en;

  return (
    <div className="relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50 ring-1 ring-black/5">
      <div className="absolute inset-0 -z-10 opacity-20">
        {content.imageUrl && (
          <Image
            src={content.imageUrl}
            alt={title}
            fill
            className="object-cover"
            priority
          />
        )}
      </div>

      <div className="relative px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-4xl">
          {/* Badge */}
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center rounded-full bg-rose-600 px-3 py-1 text-xs font-medium text-white shadow-sm">
              <span className="mr-1">🎉</span>
              {lang === 'ta' ? 'நிகழ்வு' : 'Event'}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="mt-4 text-center text-lg text-gray-700 sm:text-xl">
            {subtitle}
          </p>

          {/* Description */}
          {description && (
            <p className="mt-4 text-center text-base text-gray-600 max-w-2xl mx-auto">
              {description}
            </p>
          )}

          {/* CTA Button */}
          {ctaText && content.ctaLink && (
            <div className="mt-8 flex justify-center">
              <Link
                href={content.ctaLink}
                className="inline-flex items-center rounded-lg bg-rose-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 transition-colors"
              >
                {ctaText}
                <svg
                  className="ml-2 -mr-1 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>
          )}

          {/* Date Range Display */}
          {(content.startDate || content.endDate) && (
            <div className="mt-6 flex justify-center text-sm text-gray-500">
              {content.startDate && (
                <span>
                  {lang === 'ta' ? 'தொடங்கும் தேதி:' : 'Starts:'}{' '}
                  {new Date(content.startDate).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
              {content.startDate && content.endDate && (
                <span className="mx-2">•</span>
              )}
              {content.endDate && (
                <span>
                  {lang === 'ta' ? 'முடியும் தேதி:' : 'Ends:'}{' '}
                  {new Date(content.endDate).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
