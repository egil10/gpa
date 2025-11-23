# Course Discovery Status & Instructions

## ✅ Ready to Run!

All discovery scripts are set up and ready. Here's what you need to know:

## 📊 Current Status

| Institution | Script | Status | File Size | Notes |
|-------------|--------|--------|-----------|-------|
| NHH (All) | `discover-nhh-all` | ✅ Complete | 27 KB | 657 courses |
| NHH (Bachelor) | `discover-nhh` | ✅ Complete | 2 KB | 44 courses (legacy) |
| NTNU | `discover-ntnu` | ✅ Complete | 337 KB | 7,643 courses |
| UiO | `discover-uio` | ✅ Complete | 203 KB | 4,800 courses |
| UiB | `discover-uib` | ✅ Complete | 147 KB | 3,361 courses |

## 🚀 Commands to Run

### Option 1: Run All (Sequentially)
```bash
npm run discover-nhh-all   # NHH all courses (657 courses)
npm run discover-uio       # UiO courses (4,800 courses) 
npm run discover-uib       # UiB courses (3,361 courses)
npm run discover-ntnu      # NTNU courses (7,643 courses)
```

### Option 2: Run Specific Institution
Just run the script you need:
```bash
npm run discover-uio    # Just UiO
npm run discover-ntnu   # Just NTNU
# etc.
```

## ⏱️ Estimated Time

Based on previous runs:
- **NHH (all)**: ~2 minutes
- **UiO**: ~3-5 minutes
- **UiB**: ~3-5 minutes  
- **NTNU**: ~5-8 minutes

**Total for all**: ~15-20 minutes

## 📝 What Happens

Each script will:
1. ✅ Fetch courses year-by-year (2020-2025)
2. ✅ Merge and deduplicate courses
3. ✅ Export in optimized JSON format (compact, no whitespace)
4. ✅ Save to `data/institutions/[institution]-all-courses.json`
5. ✅ Show summary statistics

## 🔄 After Running

1. **Optimize** (optional - scripts already export optimized format):
   ```bash
   npm run optimize-courses
   ```

2. **Build** (automatically copies files to public/):
   ```bash
   npm run build
   ```

3. **Test** - Check that autocomplete works with new data

## 💡 Tips

- Scripts include delays between API calls to be nice to the server
- Progress is shown in real-time
- Files are saved incrementally (safe to interrupt/restart)
- Already-fetched data is merged with new data (no duplicates)

## ⚠️ Notes

- All scripts now export in **optimized format** automatically
- Files are ~98% smaller than original format
- Scripts handle errors gracefully and continue with next year
- Can be run multiple times safely (merges data)

