# Home Carousel Implementation

## Overview
The home carousel has been enhanced with meaningful content specifically designed for GSDTA Tamil School non-profit organization.

## Carousel Slides

### 1. **Hero Slide** - "Empowering Tamil Heritage Through Education"
- **Purpose**: Welcome visitors with inspiring message
- **Image**: Main GSDTA banner showcasing school community
- **Style**: Gradient background (rose/pink) with overlay
- **Impact**: Creates emotional connection immediately

### 2. **Impact Statistics** - "Making a Real Impact"
- **Purpose**: Show credibility and scale of operations
- **Features**: 
  - 200+ Students
  - 45 Teachers
  - 200+ Years Combined Experience
  - 25+ Volunteers
- **Special**: Uses `CarouselStatsCard` component with icons and visual grid
- **Impact**: Builds trust through concrete numbers

### 3. **Programs Slide** - "Comprehensive Tamil Programs"
- **Purpose**: Highlight educational offerings
- **CTA**: "View Classes" button linking to `/classes`
- **Impact**: Directs interested visitors to detailed information

### 4. **Cultural Celebration** - "Celebrating Tamil Culture"
- **Purpose**: Showcase cultural activities and events
- **Image**: Students performing traditional dance
- **Impact**: Emphasizes cultural preservation mission

### 5. **Community Support** - "Strong Community Support"
- **Purpose**: Highlight volunteer and family engagement
- **Image**: Community gathering
- **Impact**: Shows collaborative environment

### 6. **Student Success** - "Student Success Stories"
- **Purpose**: Demonstrate educational effectiveness
- **Impact**: Provides social proof and outcomes

### 7. **STEM Workshops**
- **Purpose**: Show modern educational approaches
- **Impact**: Appeals to parents seeking comprehensive education

### 8. **Enrollment CTA** - "Ready to Join Us?"
- **Purpose**: Clear call-to-action for enrollment
- **CTA**: "Enroll Now" button (prominent rose background)
- **Link**: Direct to `/enrollment`
- **Style**: Gradient background (amber/rose) for attention
- **Impact**: Converts visitors into enrolled students

## Technical Features

### Accessibility
- ✅ ARIA labels and roles for screen readers
- ✅ Keyboard navigation (Arrow keys, Home, End)
- ✅ Pause on hover for better readability
- ✅ Respects `prefers-reduced-motion`
- ✅ Proper semantic HTML structure

### User Experience
- ✅ Auto-advance every 5 seconds
- ✅ Smooth scroll animations
- ✅ Touch/swipe support on mobile
- ✅ Visual indicators (dots) for current slide
- ✅ Previous/Next buttons with hover effects
- ✅ Responsive design (90% mobile, 48% tablet, 32% desktop)

### Bilingual Support
- ✅ Full English/Tamil translations via i18n
- ✅ All text content supports language switching
- ✅ Tamil font rendering optimized

### Visual Design
- ✅ Different styles for slide types (hero, stats, CTA, regular)
- ✅ Gradient backgrounds for special slides
- ✅ Shadow effects on hover
- ✅ Dark mode support throughout
- ✅ Rose color scheme matching brand

## Files Modified/Created

1. **`src/data/home.ts`** - Carousel slide data with 8 meaningful slides
2. **`src/components/home/HomeCarousel.tsx`** - Enhanced carousel component
3. **`src/components/home/CarouselStatsCard.tsx`** - NEW: Stats display component
4. **`src/i18n/messages.ts`** - Added 16+ new translation keys

## Translation Keys Added

All keys prefixed with `home.carousel.*`:
- `title`, `hero.title`, `hero.description`
- `impact.title`, `impact.students`, `impact.teachers`, etc.
- `programs.title`, `programs.description`
- `culture.title`, `culture.description`
- `community.title`, `community.description`
- `success.title`, `success.description`
- `cta.title`, `cta.description`, `cta.button`

## Future Enhancements (Optional)

1. **Real Student Testimonials**: Replace placeholder with actual student quotes
2. **Video Integration**: Add video slide showcasing classroom activities
3. **Event Calendar Integration**: Dynamic slide showing upcoming events
4. **Donation Impact**: Add slide showing "Your $50 provides..." metrics
5. **Photo Gallery**: Multiple images per slide with mini-carousel
6. **Animation Effects**: Subtle animations for text/images on slide transition

## Usage

The carousel is automatically displayed on the homepage. No configuration needed. To modify slides:

```typescript
// In src/data/home.ts
export const slides: Slide[] = [
  {
    id: "unique-id",
    type: "hero" | "stats" | "cta" | undefined,
    title: "Your Title",
    description: "Optional description",
    image: "/images/your-image.jpg",
    alt: "Accessibility description",
    link: "/optional-link",
    linkText: "Optional Button Text",
  },
  // ... more slides
];
```

## Testing Recommendations

- ✅ Test on mobile devices (touch/swipe)
- ✅ Test keyboard navigation
- ✅ Test with screen reader
- ✅ Test language switching
- ✅ Test in dark mode
- ✅ Verify all images load correctly
- ✅ Test auto-advance and pause on hover

## Performance

- Images use Next.js Image component with proper sizing
- Lazy loading for off-screen slides
- Optimized re-renders with React hooks
- No layout shift (fixed aspect ratios)

