'use client';

import { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase/client';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { HeroContent } from '@/types/heroContent';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'hero_content_cache';

interface CachedData {
  content: HeroContent | null;
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
 * This minimizes Firestore reads while ensuring fresh data
 */
export function useHeroContent() {
  const [content, setContent] = useState<HeroContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function initialize() {
      try {
        // Check cache first
        const cached = loadFromCache();
        if (cached) {
          setContent(cached);
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

  function loadFromCache(): HeroContent | null {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data: CachedData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - data.timestamp < CACHE_TTL) {
        return data.content;
      }

      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (err) {
      console.error('Error reading cache:', err);
      return null;
    }
  }

  function saveToCache(heroContent: HeroContent | null) {
    if (typeof window === 'undefined') return;

    try {
      const data: CachedData = {
        content: heroContent,
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
        let activeContent: HeroContent | null = null;
        const now = new Date();

        // Find the first content that matches date range
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
            activeContent = {
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
            };
            break; // Take first match (highest priority)
          }
        }

        setContent(activeContent);
        setLoading(false);
        setError(null);
        
        // Update cache
        saveToCache(activeContent);
      },
      (err) => {
        console.error('Error in hero content subscription:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }

  return { content, loading, error };
}
