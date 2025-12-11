# Hero Content Not Showing - Root Cause & Fix

**Date**: December 11, 2025  
**Issue**: Annual Day event not showing on homepage, Thirukkural displayed instead

---

## 🔍 Root Cause

The event end date was in the **past**:
- Event end date: **January 15, 2025** (11 months ago)
- Current date: **December 10, 2025**
- Date range check failed: `endDate >= now` returned false

### Why This Happened

The seed data was created with 2024-2025 dates, but the system is now in 2025-2026.

---

## ✅ Solution

Updated the hero content dates in Firestore:

```javascript
startDate: December 1, 2025  →  Now valid
endDate:   January 15, 2026   →  Extended to next year
```

### Script Used

```javascript
// scripts/update_hero_date.js
const heroRef = db.collection('heroContent').doc('hero-annual-day-2024');
await heroRef.update({
  startDate: new Date('2025-12-01T00:00:00Z'),
  endDate: new Date('2026-01-15T00:00:00Z'),
  updatedAt: admin.firestore.Timestamp.now()
});
```

---

## 📋 How Hero Content Works

### Date Range Logic (useHeroContent.ts)

```typescript
const isWithinRange = 
  (!startDate || startDate <= now) &&
  (!endDate || endDate >= now);
```

### Display Priority

1. **Check for active event** (isActive=true + within date range)
2. **If found**: Show `HeroEventBanner` 
3. **If not found**: Show `HeroThirukkural` (default)

### Caching

- Client-side cache: 5 minutes TTL in localStorage
- Real-time updates: Firestore onSnapshot listener
- Cache key: `hero_content_cache`

---

## 🧪 Testing

### Verify Date Range

```bash
node -e "
const now = new Date();
const startDate = new Date('2025-12-01T00:00:00Z');
const endDate = new Date('2026-01-15T00:00:00Z');
console.log('Now:', now.toISOString());
console.log('Within range:', startDate <= now && endDate >= now);
"
```

### Check Firestore Data

```bash
curl -s "http://localhost:8889/v1/projects/demo-gsdta/databases/(default)/documents/heroContent/hero-annual-day-2024" | python3 -m json.tool | grep -A 3 "Date"
```

### Clear Cache

```javascript
// In browser console:
localStorage.removeItem('hero_content_cache');
location.reload();
```

---

## 🎯 Result

After updating dates and clearing cache:
- ✅ Event banner shows on homepage
- ✅ Thirukkural hidden (event takes priority)
- ✅ Real-time updates working
- ✅ Valid until January 15, 2026

---

## 📝 For Future Events

When creating new hero content:

1. **Always use future dates** relative to current time
2. **Check date range** before activating
3. **Test date logic**: `startDate <= now <= endDate`
4. **Consider time zones**: Use UTC timestamps

### Example Seed Data

```typescript
{
  startDate: new Date('2025-12-01T00:00:00Z'),
  endDate: new Date('2026-01-31T23:59:59Z'),  // Use end of day
  isActive: true,
  priority: 10
}
```

---

## 🛠️ Admin UI Enhancement Needed

The admin hero content page should show warnings:
- ⚠️ Event date is in the past
- ⚠️ Event ends soon (< 7 days)
- ✅ Event is currently active
- 📅 Days until event starts/ends

This would prevent confusion about why events aren't showing.

---

## ✅ Summary

**Problem**: Date range check failed (event ended 11 months ago)  
**Solution**: Updated endDate to 2026  
**Prevention**: Better date validation in admin UI + warnings

Event is now live and showing correctly! 🎉
