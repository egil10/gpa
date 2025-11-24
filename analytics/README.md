# Analytics Reports

This folder contains comprehensive analytics reports generated from the course data.

## Reports

### 📊 [analytics-report.md](./analytics-report.md)
Comprehensive analytics report including:
- Global overview statistics
- Institutions ranked by course count and student count
- Year coverage analysis
- Course code extremes (longest/shortest)
- Data quality issues and unusual patterns
- Per-institution detailed breakdowns

### 📈 [top-bottom-courses.md](./top-bottom-courses.md)
Detailed course-level analysis including:
- Top 50 courses by student count (all institutions)
- Bottom 50 courses by student count
- Top 50 courses by years of data
- Top courses per institution

## Generating Reports

To regenerate these reports, run:

```bash
npm run analytics
```

This will analyze all course data files in `data/institutions/` and generate fresh reports.

## Key Metrics

- **Total Institutions**: 36
- **Total Courses**: ~102,000
- **Total Students (Last Year)**: ~1.8 million
- **Year Range**: 2004-2025

## Data Quality Checks

The reports include checks for:
- Missing student counts
- Courses with no years data
- Unusual course code patterns
- Gaps in year coverage
- Other data anomalies

Use these reports to identify potential data quality issues and areas for improvement.

