# Data Strategy & Architecture

## 🎯 Current Architecture: Hybrid Approach

We use a **hybrid approach** that combines the best of both worlds:

### 1. **Static Course Lists** (Pre-fetched, stored in JSON)
- **What**: List of all available courses for autocomplete
- **When**: Fetched once via discovery scripts
- **Where**: Stored in `data/institutions/*.json` files
- **Why**: 
  - Fast autocomplete (no API delay)
  - Course lists don't change often
  - Works with static export
  - Reduces API calls

**Example:**
- NHH: 44 Bachelor courses in `data/institutions/nhh-bachelor-courses.json`
- UiO: 4,800 courses in `data/institutions/uio-all-courses.json`
- UiB: 3,361 courses in `data/institutions/uib-all-courses.json`

### 2. **Dynamic Grade Data** (Fetched in real-time)
- **What**: Grade distribution statistics for a specific course
- **When**: Fetched when user searches for a course
- **Where**: Fetched from NSD API via proxy
- **Why**:
  - Grade data is large (thousands of courses × multiple years)
  - Data updates yearly
  - Only needed when user searches
  - Can't pre-fetch everything (too much data)

**Example:**
- User searches "IN2010" → Fetches grade data for that course
- User searches "BED1" → Fetches grade data for that course

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    DISCOVERY PHASE                       │
│  (Run locally, one-time or periodic)                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  npm run discover-nhh               │
        │  npm run discover-uio               │
        │  npm run discover-uib               │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  Fetches all course codes           │
        │  from NSD API (year by year)        │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  Saves to JSON files:                │
        │  - data/institutions/nhh-*.json      │
        │  - data/institutions/uio-*.json      │
        │  - data/institutions/uib-*.json      │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  npm run build                      │
        │  (Copies to public/ folder)         │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  Deploy to website                  │
        │  (Static JSON files included)       │
        └─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    RUNTIME PHASE                         │
│  (Happens when user visits website)                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  User types course code             │
        │  → Autocomplete loads from          │
        │    static JSON (fast!)              │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  User clicks "Søk"                  │
        │  → Fetches grade data from          │
        │    NSD API (real-time)              │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  Displays grade statistics          │
        │  (charts, averages, etc.)           │
        └─────────────────────────────────────┘
```

## ✅ Why This Approach?

### Advantages:

1. **Fast Autocomplete**
   - No API delay when typing
   - Instant suggestions from static JSON
   - Better user experience

2. **Efficient API Usage**
   - Only fetch grade data when needed
   - Don't pre-fetch thousands of courses' grade data
   - Reduces API load

3. **Works with Static Export**
   - JSON files included in build
   - No server needed for course lists
   - Can deploy to GitHub Pages, Netlify, etc.

4. **Updatable**
   - Run discovery scripts when new courses appear
   - Rebuild and redeploy
   - Grade data always fresh (fetched on-demand)

### Trade-offs:

1. **Course lists need periodic updates**
   - Run discovery scripts when new courses are added
   - But this is rare (maybe once a year)

2. **Grade data requires API call**
   - Small delay when searching
   - But only fetches what's needed

## 🔄 Update Workflow

### When to Update Course Lists:

1. **New academic year** (typically fall)
2. **New courses added** to institutions
3. **Periodic refresh** (e.g., quarterly)

### How to Update:

```bash
# 1. Re-discover courses
npm run discover-nhh
npm run discover-uio
npm run discover-uib

# 2. Rebuild (auto-copies to public/)
npm run build

# 3. Deploy
git add .
git commit -m "Update course lists"
git push
```

## 🎯 Alternative Approaches (Not Recommended)

### ❌ Option 1: Fetch Everything Every Time
- **Problem**: Too slow, too much data
- **Would need**: Server-side caching anyway
- **Not suitable**: For static export

### ❌ Option 2: Pre-fetch All Grade Data
- **Problem**: Thousands of courses × multiple years = huge files
- **Would need**: Gigabytes of data
- **Not practical**: Most users only search a few courses

### ✅ Current: Hybrid (Best of Both)
- **Course lists**: Static (fast, small)
- **Grade data**: Dynamic (fresh, on-demand)

## 📝 Summary

**Current Strategy:**
- ✅ **Course lists**: Pre-fetched → Static JSON → Fast autocomplete
- ✅ **Grade data**: Real-time → API fetch → Fresh data

**Workflow:**
1. Run discovery scripts locally (one-time or periodic)
2. JSON files saved to `data/institutions/`
3. Build copies to `public/` folder
4. Deploy static files
5. Users get fast autocomplete from static JSON
6. Grade data fetched on-demand when searching

**This is the optimal approach!** 🎉

