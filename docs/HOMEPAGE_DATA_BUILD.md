# Homepage Data Build Guide

This guide explains how to rebuild the homepage data after making changes to the homepage data generation scripts.

## What Changed

The homepage data generation (`build-homepage-data.ts`) now:
- **Sorts courses by A-F grade count** instead of total student count
- Selects top courses based on the number of students with A-F letter grades
- Provides real-time output during the build process
- **Optimized to check fewer courses** (15-30 per institution instead of 40-60)
- **Early stopping** once enough candidates are found (stops after finding 5 courses with A-F grades)

## How to Run

### Option 1: Rebuild Homepage Data Only (Fastest)

If you already have discovered course data and just want to rebuild the homepage data:

```bash
npm run build-home-data
```

This will:
- Check courses for A-F grade data
- Sort by A-F grade count (descending)
- Generate `public/data/homepage-top-courses.json`

**Time:** ~1-3 minutes (depends on API response times, optimized with early stopping)

### Option 2: Run Full Post-Discovery Workflow

If you want to run all post-discovery steps (copy data, build homepage data, build grade data, etc.):

```bash
npm run post-discovery
```

This will:
1. Copy all discovered files to public folder
2. Build homepage data (with real-time output)
3. Build homepage grade data (with real-time output)
4. Build hardcoded 28 courses

**Time:** ~5-10 minutes

### Option 3: Full Discovery + Build (Complete Workflow)

If you want to discover all courses and then build everything:

```bash
npm run discover-and-build
```

Or with parallel discovery:

**PowerShell:**
```powershell
$env:DISCOVERY_CONCURRENCY=5; npm run discover-and-build
```

**CMD:**
```cmd
set DISCOVERY_CONCURRENCY=5 && npm run discover-and-build
```

**Bash/Zsh:**
```bash
DISCOVERY_CONCURRENCY=5 npm run discover-and-build
```

This will:
1. Discover all courses from all institutions
2. Run the full post-discovery workflow

**Time:** ~30-60 minutes (depends on number of institutions)

## Real-Time Output

The `post-discovery` script now shows **real-time output** for verbose steps:
- **Homepage Data** step: You'll see progress as courses are checked and validated
- **Homepage Grades** step: You'll see progress as grade data is fetched

Other steps show summary output only.

## Output File

The generated homepage data is saved to:
```
public/data/homepage-top-courses.json
```

This file contains:
- Top courses from each institution
- Sorted by A-F grade count (descending)
- Includes `letterGradeCount` field showing number of students with A-F grades

## Troubleshooting

### If you get API errors:
- The script includes rate limiting and retries
- Check your internet connection
- Some courses may not have A-F grade data available

### If you want to see more details:
- The script logs each course as it's processed
- Look for ✅ (has A-F grades) or ⚠️ (no A-F grades) indicators

### If the output file doesn't update:
- Make sure the script completed successfully
- Check that `public/data/` directory exists
- Verify file permissions

