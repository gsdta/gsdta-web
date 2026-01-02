import { stats, slides } from '../home';
import type { StatTile, Slide } from '../home';

describe('home data', () => {
  describe('stats', () => {
    it('HD-001: exports stats array', () => {
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
    });

    it('HD-002: each stat has required properties', () => {
      stats.forEach((stat: StatTile) => {
        expect(stat).toHaveProperty('id');
        expect(stat).toHaveProperty('title');
        expect(typeof stat.id).toBe('string');
        expect(typeof stat.title).toBe('string');
      });
    });

    it('HD-003: stats have unique IDs', () => {
      const ids = stats.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('HD-004: includes expected stats', () => {
      const ids = stats.map((s) => s.id);
      expect(ids).toContain('students');
      expect(ids).toContain('teachers');
    });
  });

  describe('slides', () => {
    it('HD-005: exports slides array', () => {
      expect(Array.isArray(slides)).toBe(true);
      expect(slides.length).toBeGreaterThan(0);
    });

    it('HD-006: each slide has required properties', () => {
      slides.forEach((slide: Slide) => {
        expect(slide).toHaveProperty('id');
        expect(slide).toHaveProperty('titleKey');
        expect(slide).toHaveProperty('image');
        expect(slide).toHaveProperty('alt');
        expect(typeof slide.id).toBe('string');
        expect(typeof slide.titleKey).toBe('string');
      });
    });

    it('HD-007: slides have unique IDs', () => {
      const ids = slides.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('HD-008: includes hero slide', () => {
      const heroSlide = slides.find((s) => s.id === 'hero');
      expect(heroSlide).toBeDefined();
      expect(heroSlide?.type).toBe('hero');
    });

    it('HD-009: slides with links have linkTextKey', () => {
      slides.forEach((slide) => {
        if (slide.link) {
          expect(slide.linkTextKey).toBeDefined();
        }
      });
    });
  });
});
