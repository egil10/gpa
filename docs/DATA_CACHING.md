# Data Caching Guide

## Overview

To improve performance and reliability, grade data for popular courses is cached locally. This eliminates CORS issues and provides instant access to historical data.

## License & Publishing to GitHub

**✅ YES, you can publish the cached data to GitHub!**

According to NLOD 2.0 license:
- ✅ You **CAN** copy and redistribute the data
- ✅ You **CAN** store it locally and publish it
- ✅ You **MUST** attribute NSD as the source (already done in footer/about page)
- ✅ You **MUST** link to the NLOD license (already done)

The cached `data/cache.json` file can be committed to GitHub. The license explicitly allows:
- Copying and making available the information
- Storing it in any format
- Redistributing it

**Attribution Requirements (Already Met):**
- ✅ NSD is attributed as the source (footer & about page)
- ✅ NLOD 2.0 license is linked
- ✅ Proper attribution text: "Inneholder data under Norsk lisens for offentlige data (NLOD) tilgjengeliggjort av NSD"

## File Size Limits

### GitHub Limits:
- **Individual file**: 100 MB limit
- **Repository**: No hard limit (but GitHub recommends < 1 GB for optimal performance)

### Expected Cache Size:
- **232 courses** × **~5-10 years** × **~6 grades** = **~7,000-14,000 entries**
- Each entry: ~200-500 bytes
- **Estimated total**: **1.5-7 MB** (well under 100 MB limit)

### If Cache Gets Too Large:
- Use Git LFS for files > 50 MB
- Split cache into multiple files by institution
- Compress JSON (though readable JSON is preferred)

## How It Works

1. **Cache Storage**: Data is stored in `data/cache.json`
2. **Cache Key**: `${institutionCode}-${courseCode}` (e.g., `1110-IN2010`)
3. **Automatic Fallback**: If cache miss, falls back to API
4. **Server-Side Only**: Cache is only used server-side (during build/SSR)

## Fetching and Updating Cache

### Initial Setup

1. **Install dependencies** (if not already):
   ```bash
   npm install
   ```

2. **Fetch cache for all popular courses**:
   ```bash
   npm run fetch-cache
   ```

This will:
- Fetch data for all courses in `lib/courses.ts`
- Store results in `data/cache.json`
- Show progress and statistics
- Process in batches to avoid API rate limits

### Updating Cache

Run the same command to update:
```bash
npm run fetch-cache
```

The script will:
- Fetch fresh data for all courses
- Overwrite existing cache
- Update metadata (last updated timestamp)

### Cache Validity

- Cache is considered valid for **30 days**
- After 30 days, you should update it
- The app will still work with older cache, but may be outdated

## Cache Structure

```json
{
  "1110-IN2010": [
    {
      "Institusjonskode": "1110",
      "Emnekode": "IN2010",
      "Karakter": "A",
      "Årstall": "2022",
      "Antall kandidater totalt": "18"
    },
    ...
  ],
  "metadata": {
    "lastUpdated": "2025-01-15T10:30:00.000Z",
    "totalCourses": 150,
    "totalEntries": 5000
  }
}
```

## How the App Uses Cache

1. **Server-Side (Build/SSR)**:
   - Checks cache first
   - Falls back to API if cache miss
   - No CORS issues!

2. **Client-Side**:
   - Always uses API (cache not available in browser)
   - May hit CORS issues (use Vercel proxy if needed)

## Benefits

✅ **Fast**: Instant data access  
✅ **Reliable**: No CORS issues for cached data  
✅ **Offline**: Works during build without API  
✅ **Cost-Effective**: Reduces API calls  

## Adding New Courses

1. Add course to `lib/courses.ts`
2. Run `npm run fetch-cache` to fetch data
3. Commit both `lib/courses.ts` and `data/cache.json`

## Troubleshooting

### Cache Not Working

- **Check file exists**: `data/cache.json` should exist
- **Check format**: Should be valid JSON
- **Check key format**: `${institutionCode}-${courseCode}`

### Fetch Fails

- **API down**: NSD API might be temporarily unavailable
- **Rate limiting**: Script includes delays, but API might still rate limit
- **Network issues**: Check your internet connection

### Outdated Data

- Run `npm run fetch-cache` to update
- Check `metadata.lastUpdated` in cache file

## API Rate Limits

### NSD API:
- **No documented rate limits** (but be respectful)
- Script includes **1 second delay** between batches
- **5 courses per batch** = ~1 request per second
- **232 courses** = ~46 seconds total (plus API response time)

### If You Hit Limits:
- Increase delay between batches (edit `fetch-cache.ts`)
- Reduce batch size (currently 5)
- Run script multiple times (it will skip already-fetched courses if you modify it)

### Recommended:
- Run during off-peak hours
- Don't run multiple instances simultaneously
- Wait a few minutes between full cache updates

## Future Improvements

- [ ] Incremental updates (only fetch changed courses)
- [ ] Client-side cache (IndexedDB)
- [ ] Cache versioning
- [ ] Automatic cache refresh on build

