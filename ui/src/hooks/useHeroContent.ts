'use client';

import { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase/client';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { HeroContent } from '@/types/heroContent';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'hero_content_cache';

interface CachedData {
  contents: HeroContent[];
  timestamp: number;
}

/**
 * Hook to fetch and cache active hero content with real-time updates
 *
 * Client-side caching strategy:
 * 1. Check localStorage for cached data (5-min TTL)
 * 2. If cache valid, use it immediately
 * 3. Subscribe to Firestore real-time updates in background
 * 4. Update cache when data changes
 *
 * Returns ALL active hero content items within their date range,
 * sorted by priority (highest first). This allows the UI to rotate
 * through multiple events.
 */
export function useHeroContent() {
  // Return all matching content items, not just one
  const [contents, setContents] = useState<HeroContent[]>([]);
  // Keep single content for backward compatibility
  const [content, setContent] = useState<HeroContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function initialize() {
      try {
        // Check cache first
        const cached = loadFromCache();
        if (cached && cached.length > 0) {
          setContents(cached);
          setContent(cached[0]);
          setLoading(false);
        }

        // Subscribe to real-time updates
        unsubscribe = await subscribeToHeroContent();
      } catch (err) {
        console.error('Error initializing hero content:', err);
        setError(err instanceof Error ? err.message : 'Failed to load hero content');
        setLoading(false);
      }
    }

    initialize();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadFromCache(): HeroContent[] {
    if (typeof window === 'undefined') return [];

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return [];

      const data: CachedData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - data.timestamp < CACHE_TTL) {
        return data.contents || [];
      }

      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY);
      return [];
    } catch (err) {
      console.error('Error reading cache:', err);
      return [];
    }
  }

  function saveToCache(heroContents: HeroContent[]) {
    if (typeof window === 'undefined') return;

    try {
      const data: CachedData = {
        contents: heroContents,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  }

  async function subscribeToHeroContent(): Promise<() => void> {
    const db = getFirebaseDb();

    // Query for active hero content
    const q = query(
      collection(db, 'heroContent'),
      where('isActive', '==', true),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activeContents: HeroContent[] = [];
        const now = new Date();

        // Find ALL content that matches date range
        for (const doc of snapshot.docs) {
          const data = doc.data();

          // Convert Firestore Timestamps to ISO strings
          const startDate = data.startDate ? new Date(data.startDate.seconds * 1000) : null;
          const endDate = data.endDate ? new Date(data.endDate.seconds * 1000) : null;

          // Check if within date range
          const isWithinRange =
            (!startDate || startDate <= now) &&
            (!endDate || endDate >= now);

          if (isWithinRange) {
            activeContents.push({
              id: doc.id,
              type: data.type,
              title: data.title,
              subtitle: data.subtitle,
              description: data.description || undefined,
              imageUrl: data.imageUrl || undefined,
              ctaText: data.ctaText || undefined,
              ctaLink: data.ctaLink || undefined,
              startDate: startDate?.toISOString(),
              endDate: endDate?.toISOString(),
              isActive: data.isActive,
              priority: data.priority,
              createdAt: new Date(data.createdAt.seconds * 1000).toISOString(),
              updatedAt: new Date(data.updatedAt.seconds * 1000).toISOString(),
              createdBy: data.createdBy,
              updatedBy: data.updatedBy,
            });
          }
        }

        setContents(activeContents);
        // Keep backward compatibility - first item is highest priority
        setContent(activeContents.length > 0 ? activeContents[0] : null);
        setLoading(false);
        setError(null);

        // Update cache
        saveToCache(activeContents);
      },
      (err) => {
        console.error('Error in hero content subscription:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }

  // Return both single content (backward compatible) and all contents
  return { content, contents, loading, error };
}
