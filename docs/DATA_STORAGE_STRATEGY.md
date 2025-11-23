# Data Storage Strategy - Final Recommendation

## 📊 Current Status: Optimized JSON Format

After analysis and optimization, we've achieved **98.2% size reduction**:

| Institution | Original | Optimized | Gzipped | Savings |
|-------------|----------|-----------|---------|---------|
| NTNU        | 2,298 KB | 337 KB    | **42 KB** | 98.2%   |
| UiO         | 1,384 KB | 203 KB    | **26 KB** | 98.2%   |
| UiB         | 1,012 KB | 147 KB    | **19 KB** | 98.1%   |
| NHH         | 9 KB     | 2 KB      | **0.35 KB** | 96.1%   |
| **Total**   | **4.7 MB** | **689 KB** | **87 KB** | **98.2%** |

## ✅ Decision: Optimized JSON with Gzip

**Why this approach:**
1. ✅ **Massive size reduction** - 98% smaller files
2. ✅ **Simple implementation** - Standard JSON format
3. ✅ **Browser-native** - No special libraries needed
4. ✅ **Human-readable** - Easy to debug (uncompressed)
5. ✅ **Excellent compression** - Gzip handles JSON very well
6. ✅ **Scalable** - Can handle 100K+ courses easily

## 📝 Optimized Format

### Structure
```json
{
  "i": "1150",  // Institution code
  "courses": [
    {
      "c": "TDT4110",                    // courseCode
      "n": "Datastrukturer...",          // courseName (optional)
      "y": [2025, 2024, 2023],          // years (sorted)
      "s": 2977                          // lastYearStudents (optional)
    }
  ]
}
```

### Optimizations Applied
1. **Short field names**: `c`, `n`, `y`, `s` instead of full names
2. **Minimal metadata**: Only institution code (in filename anyway)
3. **Compact JSON**: No whitespace, no pretty printing
4. **Optional fields**: Omit `null`/empty values
5. **Gzip compression**: Server/browser handles automatically

## 🔧 Implementation

### Discovery Scripts
All discovery scripts now export in optimized format automatically:
```bash
npm run discover-nhh  # Creates optimized JSON
npm run discover-uio  # Creates optimized JSON
npm run discover-uib  # Creates optimized JSON
npm run discover-ntnu # Creates optimized JSON
```

### Optimization Tool
Optional optimization of existing files:
```bash
npm run optimize-courses  # Optimizes all existing JSON files
```

### Loading
The `lib/course-loader.ts` handles both formats:
- ✅ Optimized format (new)
- ✅ Legacy format (backward compatible)

## 📈 Scalability Projections

### Current Capacity
- **15,848 courses** in **87 KB** (gzipped)
- **~182 bytes per course** (gzipped)

### Future Estimates
| Courses | Uncompressed | Gzipped | Notes |
|---------|-------------|---------|-------|
| 15K     | 689 KB      | 87 KB   | Current |
| 50K     | ~2.3 MB     | ~290 KB | Still very manageable |
| 100K    | ~4.6 MB     | ~580 KB | Still fine for web |
| 500K    | ~23 MB      | ~2.9 MB | Would need chunking |

### When to Consider Alternatives
- **>500K courses** - Consider chunking by prefix
- **>10 MB gzipped** - Consider binary format (MessagePack)
- **>50 MB gzipped** - Consider indexed database format

## 🚀 Best Practices

### 1. Always Use Optimized Format
Discovery scripts export optimized format by default.

### 2. Enable Gzip Compression
Most servers (Vercel, Netlify, GitHub Pages) enable gzip automatically.
For custom servers, configure:
```nginx
gzip_types application/json;
gzip_comp_level 6;
```

### 3. Lazy Load by Institution
Only load course data when institution is selected (already implemented).

### 4. Cache Aggressively
- Browser cache: 1 year (files rarely change)
- CDN cache: 24 hours
- Service worker: Cache for offline access

### 5. Monitor File Sizes
- Warn if any file exceeds 5 MB uncompressed
- Consider chunking if >10 MB gzipped

## 🔄 Migration Path

If we ever need to switch formats:

1. **Chunking** (e.g., `uio-courses-a-m.json`, `uio-courses-n-z.json`)
   - Split by course code prefix
   - Load chunks on-demand
   - Transparent to loader API

2. **Binary Format** (MessagePack)
   - 40% smaller than JSON
   - Faster parsing
   - Requires library (msgpack-lite)

3. **Indexed Format** (SQLite/IndexedDB)
   - Best for very large datasets
   - More complex implementation
   - Better for offline use

## ✅ Conclusion

**Optimized JSON + Gzip is the right choice** for our use case:
- Simple to implement and maintain
- Excellent compression (98% reduction)
- Scales well to 100K+ courses
- No special tooling required
- Works with static site export

We can confidently expand to more institutions and courses without worrying about file size!

