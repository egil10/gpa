# 🚀 Deploy NHH Bachelor Courses to Website

## ✅ Status: READY TO DEPLOY!

All NHH Bachelor courses have been discovered and are ready to be published!

## 📊 What Was Discovered

- **✅ 44 NHH Bachelor courses** discovered and saved
- **✅ 37 courses** with 2024 data
- **✅ 10,311 students** in 2024
- **✅ 5 years** of historical data (2020-2024)
- **✅ JSON file** saved to `data/institutions/nhh-bachelor-courses.json`
- **✅ Auto-copied** to `public/` folder during build (for static export)

## 🎯 Deploy in 3 Simple Steps

### Step 1: Verify Data Exists

```bash
# Check the JSON file exists
cat data/institutions/nhh-bachelor-courses.json
```

You should see 44 courses with codes like:
- BED1, BED2, BED3, BED4, BED5 (Bedriftsøkonomi)
- MET1, MET2, MET3, MET4 (Matematikk)
- SAM1, SAM2, SAM3, SAM4 (Samfunnsøkonomi)
- SOL1, SOL2, SOL3, SOL4 (Strategi og ledelse)

### Step 2: Build (This Will Auto-Copy Data)

```bash
npm run build
```

This will:
- ✅ Automatically copy JSON to `public/` folder (via `prebuild` script)
- ✅ Build the entire application
- ✅ Create static files ready for deployment

**Note:** The build might take 1-2 minutes. You'll see:
```
> prebuild
> node scripts/copy-nhh-data.js
✅ Copied NHH Bachelor courses data to public folder
```

### Step 3: Deploy

**For GitHub Pages:**
```bash
# The build output is in the 'out' folder
# Just commit and push - GitHub Actions should deploy automatically
git add .
git commit -m "Add NHH Bachelor courses discovery"
git push
```

**For Vercel/Netlify:**
```bash
# Just push to your repo - auto-deploy should handle it
git add .
git commit -m "Add NHH Bachelor courses discovery"
git push
```

Or manually:
```bash
vercel --prod
```

## ✅ Verification

After deployment, test:

1. **Go to your website** → Search page (`/sok` or `/gpa/sok`)
2. **Select "NHH"** as institution
3. **Type "BED1"** → Should show autocomplete suggestions
4. **Type "MET1"** → Should show autocomplete suggestions
5. **Select a course** → Should load grade statistics

## 🔄 Updating Course Data

To refresh course data (e.g., after new year):

```bash
# 1. Re-discover courses
npm run discover-nhh

# 2. Rebuild (auto-copies to public)
npm run build

# 3. Redeploy
git add .
git commit -m "Update NHH Bachelor courses"
git push
```

## 📁 Files Structure

```
data/
  institutions/
    nhh-bachelor-courses.json  ← Source data (44 courses)

public/
  nhh-bachelor-courses.json    ← Auto-copied during build

lib/
  nhh-bachelor-courses.ts      ← Library functions

components/
  CourseNameAutocomplete.tsx   ← Updated to use NHH courses
```

## 🐛 Troubleshooting

**No courses showing in autocomplete?**
- ✅ Check browser console for errors
- ✅ Verify `public/nhh-bachelor-courses.json` exists after build
- ✅ Check network tab - should fetch `/nhh-bachelor-courses.json` (or `/gpa/nhh-bachelor-courses.json`)

**Build fails?**
- ✅ Run `npm run discover-nhh` first to create the data file
- ✅ Check TypeScript errors: `npm run type-check`
- ✅ Verify `data/institutions/nhh-bachelor-courses.json` exists

**JSON file not found?**
- ✅ Run `npm run discover-nhh` to generate it
- ✅ Check that `data/institutions/` directory exists

## 📝 What Happens Automatically

When you run `npm run build`:

1. **Prebuild script runs** → Copies JSON to `public/` folder
2. **Next.js builds** → Creates static HTML/JS files
3. **JSON is included** → Available at `/nhh-bachelor-courses.json`
4. **Autocomplete loads** → Fetches JSON on first NHH selection

## 🎉 Success!

When everything works:
- ✅ Autocomplete shows 44 NHH courses
- ✅ Typing course codes shows suggestions
- ✅ Selecting a course shows grade statistics
- ✅ Everything works in static export mode

---

**Ready?** Just run `npm run build` and deploy! 🚀
