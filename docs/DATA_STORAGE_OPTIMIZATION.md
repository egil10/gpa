# Data Storage Optimization Strategy

## 📊 Current Data Volumes

| Institution | Courses | File Size | Avg per Course |
|-------------|---------|-----------|----------------|
| NHH         | 44      | 8.92 KB   | 0.20 KB        |
| UiO         | 4,800   | 1,384 KB  | 0.29 KB        |
| UiB         | 3,361   | 1,012 KB  | 0.30 KB        |
| NTNU        | 7,643   | 2,298 KB  | 0.30 KB        |
| **Total**   | **15,848** | **~4.7 MB** | **0.29 KB** |

## 🎯 Recommended Strategy: Optimized JSON with Chunking

### Phase 1: Current Approach (Good for <20K courses)
**Status**: ✅ Already implemented, works well

**Structure:**
```
data/institutions/
  ├── nhh-bachelor-courses.json      (9 KB)
  ├── uio-all-courses.json           (1.4 MB)
  ├── uib-all-courses.json           (1.0 MB)
  └── ntnu-all-courses.json          (2.3 MB)
```

**Optimizations to add:**
1. ✅ Lazy loading per institution (only load when selected)
2. ⚠️  JSON compression (gzip) - reduces size by ~70%
3. ⚠️  Remove redundant metadata from export

### Phase 2: Chunked Loading (For >20K courses or >10 MB)

**When to implement:** When any single file exceeds 5 MB or total exceeds 10 MB

**Structure:**
```
data/institutions/
  ├── nhh-bachelor-courses.json      (unchanged)
  ├── uio-all-courses.json           (index file)
  ├── uio-all-courses-a.json         (A-M courses)
  ├── uio-all-courses-n.json         (N-Z courses)
  └── ... (similar for other institutions)
```

**Benefits:**
- Load only relevant chunks
- Faster initial load
- Better memory usage
- Scales to 100K+ courses

### Phase 3: Advanced (For >50K courses)

**Options:**
1. **Index + Full Data Separation**
   - Small index file for search (course codes + names only)
   - Full data loaded on-demand
   - Best for very large datasets

2. **Binary Format (MessagePack)**
   - ~40% smaller than JSON
   - Faster parsing
   - More complex tooling

## 📝 Current JSON Structure Analysis

### Redundant Data:
```json
{
  "institution": "NTNU",           // Redundant (in filename)
  "institutionCode": "1150",       // Redundant (in filename)
  "lastUpdated": "...",            // Not needed for autocomplete
  "totalCourses": 7643,            // Can calculate from array.length
  "yearsCovered": [2025, 2024...], // Redundant (in each course)
  "courses": [...]
}
```

### Minimal Structure (Recommended):
```json
{
  "courses": [
    {
      "code": "TDT4110",                    // Required
      "name": "Datastrukturer...",          // Optional (for search)
      "y": [2025, 2024],                    // Abbreviated
      "s": 2977                             // Abbreviated (students)
    }
  ]
}
```

**Size reduction:** ~40-50% smaller

## 🚀 Implementation Plan

### Step 1: Optimize Current JSON Structure ✅ (Do Now)
- Remove redundant metadata
- Abbreviate field names
- Remove empty optional fields
- **Expected reduction: 40-50%**

### Step 2: Add Compression ✅ (Do Now)
- Enable gzip compression for JSON files
- Browser automatically decompresses
- **Expected reduction: 70% of remaining**

### Step 3: Lazy Loading Enhancement ⚠️ (Do Later)
- Already partially implemented
- Load only when institution selected
- Add loading states/indicators

### Step 4: Chunking (If Needed) ⚠️ (Future)
- Implement when any file > 5 MB
- Split by course code prefix
- Load chunks on-demand

## 💾 Estimated Sizes After Optimization

| Institution | Current | After Optimization | Reduction |
|-------------|---------|-------------------|-----------|
| NTNU        | 2,298 KB| ~400 KB (gzipped) | 83%       |
| UiO         | 1,384 KB| ~240 KB (gzipped) | 83%       |
| UiB         | 1,012 KB| ~175 KB (gzipped) | 83%       |
| NHH         | 9 KB    | ~2 KB (gzipped)   | 78%       |
| **Total**   | **4.7 MB** | **~817 KB** | **83%** |

## ✅ Decision: Stick with JSON (Optimized)

**Why JSON:**
1. ✅ Human-readable (easy debugging)
2. ✅ Native browser support (no extra libraries)
3. ✅ Works with static export
4. ✅ Good compression ratio with gzip
5. ✅ Simple tooling

**When to reconsider:**
- If total data > 50 MB uncompressed
- If we need to load >100K courses
- If parsing becomes a bottleneck

## 🔧 Implementation Priority

1. **High Priority (Now):**
   - Optimize JSON structure (remove redundancy)
   - Add gzip compression
   - Test with all institutions

2. **Medium Priority (Later):**
   - Add chunking support (if needed)
   - Implement index-based loading
   - Add loading progress indicators

3. **Low Priority (Future):**
   - Consider binary format
   - Implement server-side caching
   - Add incremental updates

