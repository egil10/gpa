# Fetch All Grade Data - Complete Guide

This guide walks you through fetching **all** grade data for all courses across all institutions using the new comprehensive fetch script.

## 📋 Overview

The `fetch-all-grade-data.ts` script is the new primary pipeline for fetching grade data. It:
- Fetches grade data for **ALL** courses from an institution
- Uses parallel processing for speed (configurable concurrency)
- Handles all institution-specific edge cases (UiB, BI, etc.)
- Stores data in optimized format
- Supports incremental updates (only fetch missing years)
- **Safe**: Writes to separate location, won't affect existing cache

## 🎯 Quick Start

### Test on One Institution First (Recommended)

```bash
# Test on UiO with default concurrency (5)
npm run fetch-all-grade-data -- --institution=UiO

# Or with higher concurrency for faster fetching
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=UiO
```

### Fetch All Institutions

After testing, fetch for all institutions one by one:

#### Major Universities

```bash
# UiO (Universitetet i Oslo) - ~7,000 courses
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=UiO

# NTNU (Norges teknisk-naturvitenskapelige universitet) - ~7,600 courses
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=NTNU

# UiB (Universitetet i Bergen) - ~3,300 courses
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=UiB

# NHH (Norges handelshøyskole) - ~650 courses
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=NHH

# BI (Handelshøyskolen BI) - ~1,200 courses
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=BI

# OsloMet (OsloMet – storbyuniversitetet)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=OsloMet

# Nord (Nord universitet)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=Nord

# NMBU (Norges miljø- og biovitenskapelige universitet)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=NMBU

# UiA (Universitetet i Agder)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=UiA

# INN (Universitetet i Innlandet)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=INN

# UiS (Universitetet i Stavanger)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=UiS

# USN (Universitetet i Sørøst-Norge)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=USN

# UiT (Universitetet i Tromsø – Norges arktiske universitet)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=UiT
```

#### Specialized Institutions

```bash
# NMH (Norges musikkhøgskole)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=NMH

# NIH (Norges idrettshøgskole)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=NIH

# KHIO (Kunsthøgskolen i Oslo)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=KHIO

# AHO (Arkitektur- og designhøgskolen i Oslo)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=AHO
```

#### Regional Colleges

```bash
# HIM (Høgskolen i Molde, vitenskapelig høgskole i logistikk)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=HIM

# SH (Samisk høgskole)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=SH

# HiØ (Høgskolen i Østfold)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=HiØ

# HVO (Høgskulen i Volda)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=HVO

# HVL (Høgskulen på Vestlandet)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=HVL

# VID (VID vitenskapelige høgskole)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=VID

# MF (MF vitenskapelig høyskole)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=MF

# AHS (Ansgar høyskole)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=AHS

# BD (Barratt Due Musikkinstitutt)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=BD

# BAS (Bergen Arkitekthøgskole)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=BAS

# DMMH (Dronning Mauds Minne Høgskole)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=DMMH

# FIH (Fjellhaug Internasjonale Høgskole)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=FIH

# HGUt (Høgskulen for grøn utvikling)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=HGUt

# HFDK (Høyskolen for dansekunst)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=HFDK

# HLT (Høyskolen for ledelse og teologi)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=HLT

# HK (Høyskolen Kristiania)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=HK

# LDH (Lovisenberg diakonale høgskole)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=LDH

# NLA (NLA Høgskolen)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=NLA

# Steiner (Steinerhøyskolen)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=Steiner
```

#### VGS (Videregående Skole)

```bash
# VGS (Videregående Skole) - Note: VGS data is loaded from JSON, not API
# VGS data should already be available from parse-vgs-grades script
# No need to run fetch-all-grade-data for VGS
```

## 📝 Step-by-Step Instructions

### Step 1: Prerequisites

1. **Ensure you have course lists**: The script reads from `data/institutions/*.json` or `public/data/institutions/*.json`
   - If missing, run discovery scripts first: `npm run discover-uio`, `npm run discover-ntnu`, etc.

2. **Check available institutions**:
   ```bash
   # The script will show available institutions if you use an invalid one
   npm run fetch-all-grade-data -- --institution=INVALID
   ```

### Step 2: Test on One Institution

**Always test on one institution first** to ensure everything works:

```bash
# Windows PowerShell
$env:FETCH_CONCURRENCY=5; npm run fetch-all-grade-data -- --institution=UiO

# Linux/Mac
FETCH_CONCURRENCY=5 npm run fetch-all-grade-data -- --institution=UiO
```

**What to expect:**
- Script loads courses from institution file
- Shows progress bar with: `[X%] ████░░░░ X/Y ✓cached ✗failed ⊘skipped`
- Processes courses in parallel batches
- Shows ETA and elapsed time
- Saves data to `data/grade-cache-optimized/{Institution}/`

**Time estimates:**
- Small institution (NHH, ~650 courses): 30-60 minutes
- Medium institution (UiB, ~3,300 courses): 2-4 hours
- Large institution (UiO, ~7,000 courses): 4-8 hours
- Very large (NTNU, ~7,600 courses): 5-10 hours

### Step 3: Monitor Progress

The script provides real-time feedback:
- **Progress bar**: Shows completion percentage
- **Statistics**: `✓cached ✗failed ⊘skipped` counts
- **ETA**: Estimated time remaining
- **Errors**: Logged to console (non-fatal errors don't stop the script)

**Example output:**
```
╔════════════════════════════════════════════════════════════╗
║   Fetch All Grade Data (Single Institution)                ║
╚════════════════════════════════════════════════════════════╝

Configuration:
  • Institution: UiO (Universitetet i Oslo)
  • Cache location: data/grade-cache-optimized/UiO
  • ✓ Safe: Writes to separate location, won't affect existing cache
  • Concurrency: 5 (set FETCH_CONCURRENCY env var to change)
  • Incremental: OFF (only fetch new years)
  • Force rebuild: NO
  • Start time: 14:30:00

📚 Loading courses...
✅ Found 7048 courses

[45.2%] ████████████████░░░░░░░░░░░░░░░░░░░░ 3180/7048 2890✓ 45✗ 1245⊘ 2h 15m ETA: 2h 30m
```

### Step 4: Adjust Concurrency (Optional)

Higher concurrency = faster, but more API load:

```bash
# Conservative (default, recommended)
$env:FETCH_CONCURRENCY=5; npm run fetch-all-grade-data -- --institution=UiO

# Moderate (faster, still safe)
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=UiO

# Aggressive (fastest, use carefully)
$env:FETCH_CONCURRENCY=20; npm run fetch-all-grade-data -- --institution=UiO
```

**Recommendation**: Start with 5, increase to 10 if stable.

### Step 5: Process All Institutions

After successful test, process all institutions. See the "Fetch All Institutions" section above for the complete list of all institution-specific commands.

**Recommended order** (by size, smallest to largest for easier testing):
1. NHH (~650 courses) - Quick test
2. BI (~1,200 courses)
3. UiB (~3,300 courses)
4. UiO (~7,000 courses)
5. NTNU (~7,600 courses)
6. Then continue with other institutions

**Total time estimate**: 20-40 hours for all institutions (can run overnight)

### Step 6: Incremental Updates (Annual)

After initial fetch, use `--incremental` to only fetch new years:

```bash
# Only fetch missing years (much faster)
npm run fetch-all-grade-data -- --institution=UiO --incremental
```

**When to use:**
- After a new academic year
- To update with latest data
- Much faster than full rebuild

### Step 7: Generate Statistics

After fetching data, generate institution statistics:

```bash
# Generate statistics from fetched data
npm run build-institution-statistics
```

This reads from `data/grade-cache-optimized/` and generates `public/data/institution-statistics.json`.

## 🔧 Command Reference

### Basic Usage

```bash
# Fetch all courses for one institution
npm run fetch-all-grade-data -- --institution=UiO

# With custom concurrency
$env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=UiO

# Incremental mode (only missing years)
npm run fetch-all-grade-data -- --institution=UiO --incremental

# Force rebuild (overwrite existing cache)
npm run fetch-all-grade-data -- --institution=UiO --force
```

### Flags

- `--institution={Name}`: **Required**. Institution to fetch (UiO, NTNU, UiB, NHH, BI, etc.)
- `--incremental`: Only fetch missing years (faster for updates)
- `--force`: Rebuild existing cache files

### Environment Variables

- `FETCH_CONCURRENCY`: Number of parallel requests (default: 5)
  - Windows PowerShell: `$env:FETCH_CONCURRENCY=10;`
  - Linux/Mac: `FETCH_CONCURRENCY=10`

## 📊 Data Storage

### Location

Data is stored in: `data/grade-cache-optimized/{Institution}/{CourseCode}.json`

**Example:**
```
data/grade-cache-optimized/
├── UiO/
│   ├── IN2010.json
│   ├── INF100.json
│   └── ...
├── NTNU/
│   ├── TDT4110.json
│   └── ...
└── ...
```

### Format

Each file contains optimized JSON:
```json
{
  "i": "1110",
  "c": "IN2010",
  "n": "IN2010",
  "y": [2025, 2024, 2023],
  "d": [
    {"y": 2025, "g": "A", "c": 45},
    {"y": 2025, "g": "B", "c": 120},
    ...
  ],
  "f": "2025-01-15T10:30:00.000Z"
}
```

## 🚨 Troubleshooting

### Issue: "No courses found for {Institution}"

**Solution**: Run discovery script first:
```bash
npm run discover-uio  # or discover-ntnu, discover-uib, etc.
```

### Issue: Many failed requests (✗)

**Possible causes:**
1. **API rate limiting**: Reduce concurrency
   ```bash
   $env:FETCH_CONCURRENCY=3; npm run fetch-all-grade-data -- --institution=UiO
   ```

2. **Network issues**: Check internet connection

3. **Course codes don't exist**: Some courses may not have grade data (expected)

### Issue: Script is very slow

**Solutions:**
1. Increase concurrency (if stable):
   ```bash
   $env:FETCH_CONCURRENCY=10; npm run fetch-all-grade-data -- --institution=UiO
   ```

2. Run overnight for large institutions

3. Use incremental mode for updates (much faster)

### Issue: Want to resume after interruption

**Solution**: The script skips already-cached files by default. Just re-run:
```bash
npm run fetch-all-grade-data -- --institution=UiO
```

It will continue from where it left off.

### Issue: Need to rebuild specific course

**Solution**: Delete the cache file and re-run:
```bash
# Delete specific course cache
rm data/grade-cache-optimized/UiO/IN2010.json

# Re-run (will fetch that course again)
npm run fetch-all-grade-data -- --institution=UiO
```

## 📈 Progress Tracking

### Check Progress

```bash
# Count cached files
# Windows PowerShell
(Get-ChildItem data/grade-cache-optimized/UiO/*.json).Count

# Linux/Mac
ls data/grade-cache-optimized/UiO/*.json | wc -l
```

### Estimate Remaining Time

The script shows ETA in the progress bar. For manual calculation:
- Check total courses in institution file
- Count cached files
- Remaining = Total - Cached
- Time per course ≈ 2-5 seconds (depends on concurrency)

## ✅ After Fetching

### 1. Generate Statistics

```bash
npm run build-institution-statistics
```

### 2. Verify Data

Check that files were created:
```bash
# Windows PowerShell
Get-ChildItem data/grade-cache-optimized/UiO/*.json | Measure-Object | Select-Object Count

# Linux/Mac
ls data/grade-cache-optimized/UiO/*.json | wc -l
```

### 3. Check File Sizes

Large files might indicate issues:
```bash
# Windows PowerShell
Get-ChildItem data/grade-cache-optimized/UiO/*.json | Sort-Object Length -Descending | Select-Object -First 10 Name, @{Name="Size(KB)";Expression={[math]::Round($_.Length/1KB,2)}}

# Linux/Mac
ls -lhS data/grade-cache-optimized/UiO/*.json | head -10
```

## 🎯 Recommended Workflow

### Initial Setup (First Time)

1. **Test on small institution** (NHH):
   ```bash
   $env:FETCH_CONCURRENCY=5; npm run fetch-all-grade-data -- --institution=NHH
   ```

2. **Verify output**:
   - Check `data/grade-cache-optimized/NHH/` exists
   - Check files were created
   - Run statistics: `npm run build-institution-statistics`

3. **Process all institutions** (one by one, or in parallel on different machines)

### Annual Updates

1. **Use incremental mode**:
   ```bash
   npm run fetch-all-grade-data -- --institution=UiO --incremental
   ```

2. **Regenerate statistics**:
   ```bash
   npm run build-institution-statistics
   ```

## 📝 Notes

- **Safe to run**: Script writes to separate location, won't affect existing cache
- **Resumable**: Can stop and resume - already cached files are skipped
- **Parallel processing**: Uses configurable concurrency for speed
- **Error handling**: Non-fatal errors don't stop the script
- **Progress tracking**: Real-time progress bar and statistics

## 🔗 Related Scripts

- `build-institution-statistics.ts`: Generate statistics from fetched data
- `discover-*.ts`: Discover courses for institutions (run first if missing)
- `normalize-course-codes.ts`: Normalize course codes (part of pipeline)
- `fix-all-duplicates.ts`: Fix duplicate courses (part of pipeline)

## 💡 Tips

1. **Start small**: Test on NHH (smallest) before large institutions
2. **Monitor first run**: Watch for errors or issues
3. **Use incremental**: Much faster for annual updates
4. **Run overnight**: Large institutions take hours
5. **Check progress**: Use file counts to verify progress
6. **Backup**: Consider backing up `data/grade-cache-optimized/` before major changes

---

**Questions?** Check the script output - it provides detailed feedback and error messages.

