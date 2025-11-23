# Data Management Guide

Complete guide to fetching, updating, and managing course data for all Norwegian institutions.

## 📊 Overview

This project uses a **hybrid data strategy**:
- **Course Lists** (static JSON): Pre-fetched and optimized for fast autocomplete
- **Grade Data** (dynamic): Fetched from NSD API in real-time when users search

> 💡 **See [DATA_SOURCES.md](./DATA_SOURCES.md) for the exact NSD website links used to discover data!**

## 🎯 Current Data Sources

| Institution | Code | Script | Years | Courses |
|-------------|------|--------|-------|---------|
| NHH | 1240 | `discover-nhh-all` | 2000-2025 | 657 |
| NTNU | 1150 | `discover-ntnu` | 2000-2025 | 7,643 |
| UiO | 1110 | `discover-uio` | 2000-2025 | 4,800 |
| UiB | 1120 | `discover-uib` | 2000-2025 | 3,361 |

**Total**: 16,461 courses across 26 years

## 📁 Data Storage

### File Locations

- **Source files**: `data/institutions/*.json` (optimized format)
- **Public files**: `public/*.json` (copied automatically during build)
- **Backup files**: `data/institutions/*.backup` (created by optimization script)

### File Format

All course files use optimized JSON format:

```json
{
  "i": "1240",  // Institution code
  "courses": [
    {
      "c": "TDT4110",     // Course code
      "n": "Course Name", // Course name (optional)
      "y": [2025, 2024],  // Years available
      "s": 2977           // Student count (optional)
    }
  ]
}
```

**Benefits:**
- 98% smaller file size
- Faster loading
- Same functionality

## 🔄 Updating Course Data

### When to Update

Update course data:
- **Quarterly** (recommended): Every 3 months to get new courses
- **After new semester**: When new courses are added
- **When courses change**: If course codes or names change significantly

### Update Process

#### Step 1: Backup Current Data (Optional but Recommended)

```bash
# Create backup directory
mkdir -p data/backups/$(date +%Y%m%d)

# Copy current files
cp data/institutions/*.json data/backups/$(date +%Y%m%d)/

# Windows PowerShell:
# $date = Get-Date -Format "yyyyMMdd"
# New-Item -ItemType Directory -Path "data\backups\$date"
# Copy-Item data\institutions\*.json data\backups\$date\
```

#### Step 2: Run Discovery Scripts

**Important**: Scripts fetch 26 years of data (2000-2025), so this takes time!

```bash
# Update all institutions (total time: 30-60 minutes)
npm run discover-nhh-all   # 5-10 minutes
npm run discover-ntnu      # 15-20 minutes
npm run discover-uio       # 10-15 minutes
npm run discover-uib       # 10-15 minutes

# Or update just one institution
npm run discover-nhh-all   # Just NHH
```

**What happens:**
1. Script fetches courses year-by-year (2000-2025)
2. Merges and deduplicates courses
3. Saves optimized JSON to `data/institutions/`
4. Shows summary statistics

#### Step 3: Review Changes

```bash
# Check file sizes
ls -lh data/institutions/*.json

# Compare with previous versions if you backed up
```

#### Step 4: Optimize (Optional)

The scripts already export optimized format, but you can run:

```bash
npm run optimize-courses
```

This will:
- Further optimize existing files
- Create backup files
- Generate gzipped versions

#### Step 5: Build and Deploy

```bash
# Build (automatically copies files to public/)
npm run build

# Deploy (see BUILD_AND_DEPLOYMENT.md)
```

### Update Single Institution

To update just one institution:

```bash
# Update NHH only
npm run discover-nhh-all

# Build
npm run build
```

## ➕ Adding a New Institution

### Step 1: Find Institution Code

Institution codes are typically 4-digit numbers:
- UiO: 1110
- UiB: 1120
- NTNU: 1150
- NHH: 1240

You can find codes at: https://dbh.hkdir.no/

### Step 2: Check Hierarchy Structure

Different institutions use different API hierarchies:

**UiO/NTNU/UiB**: `Institusjon → Fakultet → Institutt → Emne`
**NHH**: `Institusjon → Studium → Studieprogram → Emne`

Check the drill-down structure on the NSD website first.

### Step 3: Create Discovery Script

Create a new file: `scripts/discover-[institution]-courses.ts`

**Template:**

```typescript
import { getAllCoursesForInstitution } from '../lib/hierarchy-discovery';
import { createOptimizedExport } from './utils/export-format';
import * as fs from 'fs';
import * as path from 'path';

interface CourseExport {
  courseCode: string;
  courseName?: string;
  years: number[];
  totalStudents: number;
  lastYear: number;
  lastYearStudents: number;
  studentCountByYear: Record<number, number>;
}

async function discoverInstitutionCourses() {
  const institutionCode = 'XXXX'; // Replace with actual code
  const institutionName = 'Institution Name';
  
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 2000; year--) {
    years.push(year);
  }
  
  const allCoursesMap = new Map<string, CourseExport>();
  
  // ... (copy structure from existing scripts)
  
  const outputFile = path.join(dataDir, 'institution-all-courses.json');
  const exportData = createOptimizedExport(institutionCode, allCourses);
  fs.writeFileSync(outputFile, JSON.stringify(exportData));
}

discoverInstitutionCourses().catch(console.error);
```

See existing scripts for full implementation.

### Step 4: Add Script to package.json

```json
{
  "scripts": {
    "discover-institution": "tsx scripts/discover-institution-courses.ts"
  }
}
```

### Step 5: Create Loader

Create: `lib/institution-courses.ts` (similar to `lib/nhh-courses.ts`)

### Step 6: Integrate in Autocomplete

Update `components/CourseNameAutocomplete.tsx` to use new loader.

### Step 7: Add to Copy Script

Update `scripts/copy-nhh-data.js` to copy new institution's JSON file.

### Step 8: Update Documentation

Add institution to this document and [README.md](./README.md).

## 🔍 Monitoring Data Quality

### Check File Sizes

Expected sizes (after optimization):
- NHH: ~27 KB (657 courses)
- NTNU: ~337 KB (7,643 courses)
- UiO: ~203 KB (4,800 courses)
- UiB: ~147 KB (3,361 courses)

If sizes are significantly different, something might be wrong.

### Verify Data Structure

```bash
# Check JSON is valid
node -e "JSON.parse(require('fs').readFileSync('data/institutions/nhh-all-courses.json'))"

# Should output without errors
```

### Check Course Counts

Discovery scripts show course counts at the end. Verify they make sense:
- Should be hundreds to thousands of courses per institution
- Counts should increase over time (new courses added)

## 📈 Data Statistics

### After Running Discovery Script

Each script shows:
- Total unique courses
- Courses with recent data (2024/2025)
- Total students
- Sample courses
- Distribution by prefix

### Generate Summary Report

```bash
# Create a summary script (future enhancement)
# This would analyze all institution files and create a report
```

## 🗑️ Cleaning Up Old Data

### Remove Backup Files

```bash
# Remove old backup files (keep recent ones)
rm data/institutions/*.backup

# Or keep only last 3 backups
```

### Archive Old Data

```bash
# Archive data from previous year
mkdir -p data/archive/2024
mv data/institutions/*.json data/archive/2024/
```

## ⚠️ Common Issues

### Issue: Script Fails Mid-Run

**Solution:**
- Scripts are designed to continue on errors
- Check network connection
- Verify NSD API is accessible
- Re-run the script (it will merge with existing data)

### Issue: Wrong Course Counts

**Solution:**
- Verify institution code is correct
- Check API returns data for that institution
- Review script output for errors

### Issue: Missing Courses

**Solution:**
- Some courses might not have grade data
- Check if courses exist on NSD website
- Verify year range (2000-2025)

### Issue: Duplicate Courses

**Solution:**
- Scripts automatically deduplicate
- Check for course code variations (e.g., "TDT4110" vs "TDT4110-1")
- Review merge logic in scripts

## 🔐 Data Backup Strategy

### Before Major Updates

1. **Git Commit**: Commit current data files
   ```bash
   git add data/institutions/*.json
   git commit -m "Backup: Course data before update"
   ```

2. **File Backup**: Copy files to backup directory
   ```bash
   cp -r data/institutions data/backups/$(date +%Y%m%d)
   ```

3. **Cloud Backup**: Push to remote repository
   ```bash
   git push origin main
   ```

### Recovery

If something goes wrong:

```bash
# Restore from git
git checkout HEAD -- data/institutions/*.json

# Or restore from backup
cp data/backups/YYYYMMDD/*.json data/institutions/
```

## 📝 Data Maintenance Checklist

- [ ] Update course data quarterly
- [ ] Review file sizes after updates
- [ ] Verify JSON files are valid
- [ ] Check course counts make sense
- [ ] Backup before major updates
- [ ] Clean up old backup files
- [ ] Document any special cases

## 🚀 Automation Ideas (Future)

- Scheduled updates via GitHub Actions
- Automatic validation after updates
- Email notifications on data changes
- Automated backups before updates

