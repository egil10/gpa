# Optimized Cache Setup Guide

## Overview

We've successfully fetched grade data for **35 institutions** and stored it in an optimized format in `data/grade-cache-optimized/`. This document explains how to use this data for fast website loading.

## Data Summary

**Total Institutions:** 35
**Total Files:** ~60,000+ JSON files
**Total Size:** ~500MB-1GB (estimated)

### Institutions with Data

All major Norwegian universities and colleges have been fetched:
- UiO (6,840 files)
- NTNU (7,425 files)
- UiB (3,788 files)
- BI (2,932 files)
- And 31 more institutions...

## Setup Steps

### 1. Copy Cache to Public Directory

The optimized cache is in `data/grade-cache-optimized/` but needs to be accessible via HTTP. Copy it to `public/data/grade-cache-optimized/`:

```bash
npm run copy-optimized-cache
```

This script:
- Copies all JSON files from `data/grade-cache-optimized/` to `public/data/grade-cache-optimized/`
- Preserves the directory structure (institution folders)
- Shows progress and summary

**Note:** The optimized cache directories are in `.gitignore` (they're generated files that can be regenerated). Don't commit them to Git - they're too large and change frequently.

### 2. Rebuild Institution Statistics

After copying the cache, rebuild the institution statistics to include all the new data:

```bash
npm run build-institution-statistics
```

This generates `public/data/institution-statistics.json` with aggregated statistics for all institutions.

### 3. Build the Website

Build the Next.js website:

```bash
npm run build
```

The website will now:
- Load grade data from the optimized cache (super fast!)
- Use the new institution statistics
- Fall back to API only if cache miss

## How It Works

### Cache Structure

Each course has its own JSON file:
```
public/data/grade-cache-optimized/
  ├── UiO/
  │   ├── EXPHIL.json
  │   ├── IN1010.json
  │   └── ...
  ├── NTNU/
  │   └── ...
  └── ...
```

### Optimized Format

Each file uses a compact format:
```json
{
  "i": "1110",           // institution code
  "c": "EXPHIL",         // course code
  "d": [                 // grade data
    { "y": 2024, "g": "A", "c": 150 },
    { "y": 2024, "g": "B", "c": 200 },
    ...
  ],
  "f": "2024-01-15T10:30:00Z"  // fetchedAt
}
```

### Loading Process

When a user searches for a course:

1. **In-memory cache** (fastest) - Check if already loaded
2. **localStorage** - Check browser cache
3. **Optimized cache** (new!) - Load from `/data/grade-cache-optimized/{institution}/{course}.json`
4. **Old cache.json** - Fallback to old format
5. **API** - Only if all caches miss

## Benefits

✅ **Super Fast Loading** - All data is pre-fetched and cached
✅ **No API Calls** - Website works offline (after initial load)
✅ **Complete Coverage** - All courses for all institutions
✅ **Optimized Size** - Compact JSON format reduces file size
✅ **Easy Updates** - Just re-run fetch script for new years

## Updating Data

To fetch new data or update existing:

```bash
# Fetch all data for one institution
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=UiO

# Then copy to public
npm run copy-optimized-cache

# Rebuild statistics
npm run build-institution-statistics

# Rebuild website
npm run build
```

## Troubleshooting

### Cache Not Loading

1. Check that files exist in `public/data/grade-cache-optimized/`
2. Verify file names match normalized course codes (no spaces, uppercase)
3. Check browser console for 404 errors

### Missing Data

1. Run `npm run fetch-all-grade-data` for the institution
2. Check that course codes are normalized correctly
3. Some courses may genuinely not have data in the API

### Build Errors

1. Ensure `copy-optimized-cache` ran successfully
2. Check file permissions
3. Verify JSON files are valid

## Next Steps

- ✅ All data fetched
- ✅ Cache structure created
- ✅ Website code updated to use optimized cache
- ⏳ Copy cache to public (run `npm run copy-optimized-cache`)
- ⏳ Rebuild statistics (run `npm run build-institution-statistics`)
- ⏳ Build website (run `npm run build`)

## Notes

- The optimized cache is separate from the old `cache.json` format
- Both can coexist - the website tries optimized first, then falls back
- The old `public/data/grade-cache/` directory is still used as fallback
- Institution statistics already read from optimized cache (no copy needed for that)

