# 🚀 Deploy NHH Bachelor Courses to Website

## ✅ What's Ready

All NHH Bachelor courses have been discovered and are ready to be published! Here's what was created:

1. **✅ 44 NHH Bachelor courses discovered** from 5 years of data
2. **✅ JSON data file** saved to `data/institutions/nhh-bachelor-courses.json`
3. **✅ API route** created at `/api/courses/nhh-bachelor`
4. **✅ Integration** with CourseNameAutocomplete component
5. **✅ All components updated** and ready to use

## 📦 Files Created/Updated

- `scripts/discover-nhh-bachelor.ts` - Discovery script
- `lib/nhh-bachelor-courses.ts` - Library functions
- `pages/api/courses/nhh-bachelor.ts` - API endpoint
- `components/CourseNameAutocomplete.tsx` - Updated to use NHH courses
- `data/institutions/nhh-bachelor-courses.json` - Course data (44 courses)

## 🎯 Steps to Deploy

### 1. Verify Data is Ready

```bash
# Check that the JSON file exists and has data
cat data/institutions/nhh-bachelor-courses.json
```

You should see 44 courses with data like:
- BED1, BED2, BED3, BED4, BED5 (Bedriftsøkonomi)
- MET1, MET2, MET3, MET4 (Matematikk)
- SAM1, SAM2, SAM3, SAM4 (Samfunnsøkonomi)
- SOL1, SOL2, SOL3, SOL4 (Strategi og ledelse)
- etc.

### 2. Test Locally

```bash
# Start development server
npm run dev

# Visit: http://localhost:3000/sok
# Select "NHH" as institution
# Try typing course codes like "BED1", "MET1", etc.
# You should see autocomplete suggestions!
```

### 3. Build & Test Production Build

```bash
# Build for production
npm run build

# Test the production build
npm start

# Visit: http://localhost:3000/sok
# Verify everything works
```

### 4. Deploy to Vercel (or your hosting)

If using Vercel:

```bash
# Make sure you're logged in
vercel login

# Deploy
vercel --prod
```

**Important:** Make sure the `data/` folder is included in your deployment!
- Vercel: It should be included automatically
- Other platforms: Make sure `data/` is in your repo and not in `.gitignore`

### 5. Verify Deployment

After deployment:
1. Go to your website
2. Navigate to the search page (`/sok`)
3. Select "NHH" as institution
4. Start typing a course code (e.g., "BED1")
5. You should see autocomplete suggestions with NHH Bachelor courses!

## 🔄 Updating Course Data

If you want to refresh the course data (e.g., after a new year):

```bash
# Run the discovery script again
npm run discover-nhh

# This will update data/institutions/nhh-bachelor-courses.json
# Then rebuild and redeploy
npm run build
vercel --prod
```

## 📊 What Was Discovered

- **44 Bachelor courses** from NHH
- **37 courses** with 2024 data
- **10,311 total students** in 2024
- **5 years** of historical data (2020-2024)

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Autocomplete shows NHH courses when NHH is selected
- ✅ Typing "BED" shows BED1, BED2, BED3, BED4, BED5
- ✅ Typing "MET" shows MET1, MET2, MET3, MET4
- ✅ Selecting a course and searching shows grade statistics
- ✅ API endpoint `/api/courses/nhh-bachelor` returns JSON data

## 🐛 Troubleshooting

**No courses showing in autocomplete?**
- Check browser console for errors
- Verify API route is accessible: `/api/courses/nhh-bachelor`
- Check that JSON file exists in `data/institutions/`

**API returns 404?**
- Make sure `data/institutions/nhh-bachelor-courses.json` exists
- Check file permissions
- Run `npm run discover-nhh` again

**Build fails?**
- Check TypeScript errors: `npm run type-check`
- Verify all imports are correct
- Make sure `data/` folder is not in `.gitignore`

---

**Ready to deploy?** Run `npm run build` and then `vercel --prod` (or your deployment command)! 🚀

