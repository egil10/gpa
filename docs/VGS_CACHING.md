# VGS Course Data Caching

## Overview

The VGS (Videregående skole) dataset contains **994 unique courses** across **10 years** (2015-2025) with a total of **4,691 grade records** in a **1.70 MB JSON file**. To optimize performance, we've implemented a multi-layer caching strategy.

## Caching Layers

### 1. In-Memory Cache (Fastest)
- **Location**: Runtime memory
- **Lifetime**: Per page session
- **What's cached**:
  - Full grade data (`cachedVGSData`)
  - Processed course list (`cachedCourseList`)
  - VGS courses for autocomplete (`cachedVGSCourses`)

### 2. localStorage Cache (Fast)
- **Location**: Browser localStorage
- **Lifetime**: Persistent across sessions
- **What's cached**:
  - Full grade data (`vgs-grade-data`)
  - Processed course list (`vgs-courses-list`) - **Much smaller** (~50-100 KB vs 1.70 MB)
  - Cache version for invalidation (`vgs-cache-version`)

### 3. Network Fetch (Fallback)
- **Location**: `/data/vgs-grade-statistics.json` or `/gpa/data/vgs-grade-statistics.json`
- **When used**: First load or cache miss

## Cache Strategy

### Course List Caching
The course list (codes, names, years) is cached separately from the full grade data because:
- **Much smaller**: ~50-100 KB vs 1.70 MB
- **Faster to parse**: Simple array vs complex nested structure
- **More frequently accessed**: Used for search, autocomplete, catalog

### Cache Invalidation
- **Version-based**: Cache version (`vgs-cache-version`) is checked on load
- **Automatic**: Old cache is cleared when version doesn't match
- **Manual**: `clearVGSCache()` function available for testing

## Performance Benefits

### First Load
1. Fetch JSON file (~1.70 MB)
2. Parse and process course list
3. Cache both in memory and localStorage

### Subsequent Loads
1. ✅ Check localStorage for course list (~50-100 KB)
2. ✅ Instant load if cached
3. ✅ No network request needed
4. ✅ No parsing needed

### Typical Performance
- **First load**: ~200-500ms (network + parse)
- **Cached load**: ~5-10ms (localStorage read)
- **Memory cache**: <1ms (instant)

## Cache Size Estimates

| Cache Type | Size | Notes |
|------------|------|-------|
| Full grade data | ~1.70 MB | All records with distributions |
| Course list | ~50-100 KB | Just codes, names, years |
| In-memory | ~2-3 MB | Runtime memory usage |

## Usage

### Automatic Caching
Caching happens automatically - no action needed. The system:
1. Checks localStorage first
2. Falls back to network if needed
3. Updates cache after successful fetch

### Manual Cache Clear
```typescript
import { clearVGSCache } from '@/lib/vgs-grade-data';
import { clearVGSCoursesCache } from '@/lib/vgs-courses';

// Clear all VGS caches
await clearVGSCoursesCache();
clearVGSCache();
```

### Cache Version Update
When the data structure changes, update `VGS_CACHE_VERSION` in `lib/vgs-grade-data.ts`:
```typescript
const VGS_CACHE_VERSION = '1.0'; // Increment to '1.1', '2.0', etc.
```

## Benefits

✅ **Faster initial loads**: Course list loads instantly from localStorage  
✅ **Reduced network traffic**: Only fetches on first load or cache miss  
✅ **Better UX**: Autocomplete and search work immediately  
✅ **Offline support**: Works with cached data if network fails  
✅ **Automatic invalidation**: Version-based cache clearing  

## Technical Details

### Cache Keys
- `vgs-grade-data`: Full grade statistics JSON
- `vgs-courses-list`: Processed course list (codes, names, years)
- `vgs-cache-version`: Cache version for invalidation

### Error Handling
- localStorage errors are caught and ignored (graceful degradation)
- Falls back to network fetch if cache is invalid
- Continues to work even if localStorage is unavailable

### Browser Compatibility
- Works in all modern browsers with localStorage support
- Gracefully degrades if localStorage is disabled or full
- Uses in-memory cache as fallback

