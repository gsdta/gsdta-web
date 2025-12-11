# Hero Content Carousel - Implementation Guide

**Date**: December 11, 2025  
**Feature**: Auto-sliding carousel alternating between event banner and Thirukkural

---

## 🎯 What Changed

Previously: Event banner **replaced** Thirukkural when active
Now: Event banner and Thirukkural **alternate** in a sliding carousel

### Why This Is Better

✅ Both pieces of important content are visible  
✅ Event banner gets attention without hiding daily wisdom  
✅ Better user engagement with rotating content  
✅ More dynamic and interesting homepage  

---

## 🎨 Features

### Auto-Sliding
- **Interval**: 10 seconds per slide
- **Smooth transitions**: CSS animations (500ms)
- **Auto-pauses**: Stops when user manually navigates
- **Auto-resumes**: Continues after manual interaction

### Manual Navigation
- **Slide indicators**: Two dots at top-right
- **Click to navigate**: Jump to specific slide
- **Active indicator**: Elongated dot shows current slide
- **Color-coded**: Rose for event, orange for Thirukkural

### Responsive Design
- **Mobile**: Indicators visible and touch-friendly
- **Desktop**: Smooth animations
- **Accessibility**: ARIA labels on navigation buttons

---

## 📋 Technical Implementation

### Component Structure

```typescript
HeroThirukkural (parent)
  ├─ If event active:
  │    ├─ AnnouncementBanner
  │    ├─ Slide indicators (navigation buttons)
  │    └─ Slider container
  │         ├─ Slide 1: HeroEventBanner
  │         └─ Slide 2: ThirukkuralSection
  └─ If no event:
       ├─ AnnouncementBanner
       └─ ThirukkuralSection
```

### State Management

```typescript
const [showEvent, setShowEvent] = useState(true);

// Auto-slide every 10 seconds
useEffect(() => {
  if (!content || loading) return;
  
  const interval = setInterval(() => {
    setShowEvent((prev) => !prev);
  }, 10000);
  
  return () => clearInterval(interval);
}, [content, loading]);
```

### Animation

```typescript
// Slider container
<div className="flex transition-transform duration-500 ease-in-out"
     style={{ transform: `translateX(-${showEvent ? 0 : 100}%)` }}>
  <div className="min-w-full">{/* Slide 1 */}</div>
  <div className="min-w-full">{/* Slide 2 */}</div>
</div>
```

---

## 🎛️ Configuration

### Timing

Change slide interval in `HeroThirukkural.tsx`:

```typescript
const interval = setInterval(() => {
  setShowEvent((prev) => !prev);
}, 10000); // ← Change this value (in milliseconds)
```

**Recommended values**:
- 10000ms (10s) - Current default ✅
- 8000ms (8s) - Faster rotation
- 12000ms (12s) - Slower rotation
- 15000ms (15s) - For longer event descriptions

### Animation Speed

Change transition duration:

```typescript
className="flex transition-transform duration-500 ease-in-out"
//                                        ↑
//                              Change this (in ms)
```

**Options**:
- `duration-300` - Fast (300ms)
- `duration-500` - Default ✅
- `duration-700` - Slower
- `duration-1000` - Very slow

---

## 🧪 Testing Checklist

When testing the carousel:

- [ ] Event banner slides in first (showEvent starts true)
- [ ] Auto-switches to Thirukkural after 10 seconds
- [ ] Switches back to event after another 10 seconds
- [ ] Manual click on indicators switches immediately
- [ ] Active indicator is highlighted (elongated dot)
- [ ] Transitions are smooth (no janky animations)
- [ ] Works on mobile (touch-friendly indicators)
- [ ] Works without event (shows Thirukkural only)
- [ ] Interval clears when component unmounts
- [ ] No console errors or warnings

---

## 🎨 Customization Ideas

### Different Slide Order

Start with Thirukkural instead:

```typescript
const [showEvent, setShowEvent] = useState(false); // ← Start with Thirukkural
```

### Add More Slides

Extend to 3+ slides:

```typescript
const [currentSlide, setCurrentSlide] = useState(0);
const slides = [eventBanner, thirukkural, announcement];

// In render:
style={{ transform: `translateX(-${currentSlide * 100}%)` }}
```

### Pause on Hover

```typescript
const [isPaused, setIsPaused] = useState(false);

useEffect(() => {
  if (isPaused) return; // Don't auto-slide when paused
  // ... interval logic
}, [isPaused]);

// In JSX:
<div onMouseEnter={() => setIsPaused(true)}
     onMouseLeave={() => setIsPaused(false)}>
```

---

## 🐛 Troubleshooting

### Carousel Not Sliding

**Check**:
1. Hero content is active: `content && !loading`
2. Interval is running: Check console for errors
3. Transform is applied: Inspect element, check `style` attribute

### Indicators Not Showing

**Check**:
1. Absolute positioning: `absolute top-4 right-4 z-10`
2. Parent has `relative`: Slider wrapper needs position relative
3. Z-index: Make sure indicators are above slides

### Slides Are Janky

**Check**:
1. Transition class: `transition-transform duration-500 ease-in-out`
2. Min-width: Both slides need `min-w-full`
3. Overflow: Container needs `overflow-hidden`

### Memory Leak Warning

**Check**:
1. Interval cleanup: `return () => clearInterval(interval)`
2. Dependency array: `[content, loading]` must be correct

---

## 📊 Performance

**Impact**: Minimal
- CSS transforms (hardware accelerated)
- Single interval timer
- No API calls during slides
- Re-renders only on state change

**Best Practices**:
- ✅ Use CSS transforms (not left/right positioning)
- ✅ Clean up intervals in useEffect
- ✅ Memoize static content if needed

---

## 🚀 Future Enhancements

Potential improvements:

1. **Swipe gestures** for mobile navigation
2. **Keyboard navigation** (arrow keys)
3. **Progress bar** showing time until next slide
4. **Multiple events** in carousel (3+ slides)
5. **Admin control** for slide timing
6. **Analytics** tracking slide views

---

## 📝 Related Files

- `/ui/src/components/home/HeroThirukkural.tsx` - Main carousel component
- `/ui/src/components/home/HeroEventBanner.tsx` - Event slide content
- `/ui/src/components/ThirukkuralDisplay.tsx` - Thirukkural slide content
- `/ui/src/hooks/useHeroContent.ts` - Fetches active event data

---

## ✅ Summary

The hero carousel provides a better UX by showing both event banner and Thirukkural in rotation. It's fully responsive, accessible, and performs well on all devices.

**To see it in action**: Clear browser cache and visit http://localhost:3000 🎉
