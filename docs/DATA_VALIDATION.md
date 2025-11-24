# Data Validation Checklist

This note captures the sanity checks that were run while debugging the UiB/INF100 report.

## UiB dataset sanity check

The optimized dataset already contains `INF100` with the full range of years and student counts:

```shell
node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync('public/data/institutions/uib-all-courses.json','utf8'));const course=data.courses.find(c=>c.c==='INF100');console.log(course);"
```

Output:

```
{
  c: 'INF100',
  y: [
    2025, 2024, 2023, 2022,
    2021, 2020, 2019, 2018,
    2017, 2016, 2015, 2014,
    2013, 2012, 2011, 2010,
    2009, 2008, 2007, 2006,
    2005, 2004
  ],
  s: 244
}
```

If the string does not resolve, re-run `npm run discover-uib && npm run prebuild` to refresh the dataset before cutting a release.

## Missing `hk-all-courses.json`

The console 404s were caused by `public/data/institutions/hk-all-courses.json` not being part of the published assets. Running `npm run prebuild` copies every file under `data/institutions` into `public/data/institutions`. Make sure `hk-all-courses.json` exists in **both** folders before running `npm run build`, otherwise the static export deployed to GitHub Pages will still be missing the file.


