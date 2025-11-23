# Data Cache

This directory contains cached grade statistics data from NSD (Norsk senter for forskningsdata).

## License

**Inneholder data under Norsk lisens for offentlige data (NLOD) tilgjengeliggjort av NSD (Norsk senter for forskningsdata).**

- **License**: [Norsk lisens for offentlige data (NLOD) 2.0](https://data.norge.no/nlod/no/2.0/)
- **Source**: [NSD - Norsk senter for forskningsdata](https://nsd.no)
- **Last Updated**: See `cache.json` metadata

## Files

- `cache.json` - Cached grade data for all popular courses
  - Format: JSON with course data keyed by `${institutionCode}-${courseCode}`
  - Contains metadata about last update and statistics

## Updating Cache

Run the fetch script to update:
```bash
npm run fetch-cache
```

This will:
1. Fetch fresh data from NSD API for all courses in `lib/courses.ts`
2. Update `cache.json` with latest data
3. Update metadata (lastUpdated timestamp, statistics)

## Publishing to GitHub

✅ **This data CAN be published to GitHub** according to NLOD 2.0 license.

The license allows:
- Copying and redistributing the data
- Storing it in any format
- Making it publicly available

As long as:
- NSD is properly attributed (✅ done in footer/about page)
- NLOD license is linked (✅ done)
- Attribution text is included (✅ done)

## File Size

- Current: ~1-5 MB (estimated)
- GitHub limit: 100 MB per file
- Well within limits ✅

