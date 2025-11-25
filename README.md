# Norwegian GPA Calculator

A production-grade web application for analyzing grade distributions (karakterfordelinger) and calculating Grade Point Average (GPA) for Norwegian higher education institutions and videregående skole. Built with Next.js 14, TypeScript, and a sophisticated hybrid data architecture.

**Live Application**: [https://egil10.github.io/gpa/](https://egil10.github.io/gpa/)

## Overview

This repository implements a comprehensive system for aggregating, processing, and visualizing academic grade distribution data from Norwegian universities and high schools. The application serves over 16,000 course records spanning 26 years (2000-2025) across four major institutions, with an extensible architecture supporting 40+ additional institutions.

The core focus of this application is providing detailed grade distribution analysis (karakterfordelinger), allowing students and educators to understand grading patterns, historical trends, and statistical insights across Norwegian educational institutions.

## Core Capabilities

### Grade Distribution Analysis (Karakterfordelinger)

The primary feature of this application is comprehensive grade distribution analysis:

- **Real-time Grade Statistics**: Fetch and display grade distributions for any course from Norwegian institutions
- **Multi-year Analysis**: View grade distributions across multiple years (2000-2025) with year-by-year breakdowns
- **Normalized Visualization**: Always displays complete grade scales (A-F for universities, 1-6 for videregående skole) even when certain grades have zero counts
- **Statistical Overlays**: Mean GPA, total student counts, and percentage breakdowns for each grade
- **Interactive Charts**: Responsive bar charts using Recharts with hover details and mobile optimization
- **Pass/Fail Handling**: Support for Bestått/Ikke bestått grades with conditional display logic
- **Institution Comparison**: Compare grade distributions across different institutions for the same course

### Additional Features

- **GPA Calculation**: University-scale (A=5, B=4, C=3, D=2, E=1, F=0) and videregående skole calculations
- **Course Discovery**: Advanced search and autocomplete across institutional boundaries
- **Institutional Hierarchy Navigation**: Generic system supporting complex organizational structures
- **Course Catalog**: Browseable catalog of all indexed courses with filtering and search

## Grade Distribution System

### University Grade System (A-F Scale)

The application processes and visualizes university courses using the standard Norwegian A-F grading scale:

- **A**: Excellent (5 points)
- **B**: Very good (4 points)
- **C**: Good (3 points)
- **D**: Satisfactory (2 points)
- **E**: Sufficient (1 point)
- **F**: Fail (0 points)
- **Bestått**: Pass (3 points equivalent)
- **Ikke bestått**: Fail (0 points equivalent)

Grade distributions are normalized to always show all A-F grades, even when a course has no students receiving certain grades. This ensures consistent visualization and makes it easy to compare courses.

### Videregående Skole Grade System (1-6 Scale)

For high school courses, the application uses the 1-6 scale:

- **6**: Excellent
- **5**: Very good
- **4**: Good
- **3**: Satisfactory
- **2**: Sufficient
- **1**: Fail

The system automatically detects VGS courses and applies the appropriate normalization and visualization.

### Grade Distribution Processing

The application processes grade data through several stages:

1. **Data Aggregation**: Merges duplicate entries from the API (handles cases where the same course instance appears multiple times)
2. **Normalization**: Ensures all standard grades are present in the distribution (fills missing grades with zero counts)
3. **Percentage Calculation**: Computes percentage breakdowns for each grade
4. **Average Calculation**: Calculates weighted average GPA based on grade point values
5. **Multi-year Combination**: Aggregates data across multiple years when viewing historical trends

### Visualization Features

- **Normalized Display**: A-F or 1-6 grades always shown in order, maintaining consistent x-axis labels
- **Conditional Pass/Fail**: Bestått/Ikke bestått only shown when present in the data
- **Responsive Design**: Charts adapt to mobile, tablet, and desktop viewports
- **Interactive Tooltips**: Hover to see exact counts and percentages
- **Year Toggle**: Switch between combined multi-year view and individual year breakdowns
- **Statistical Summary**: Display mean GPA and total student count alongside charts

## Architecture

### Hybrid Data Strategy

The system employs a sophisticated two-tier data architecture optimizing for both performance and data freshness:

**Static Course Lists** (Pre-computed):
- Course codes, names, and metadata stored in optimized JSON format
- Achieved 98.2% size reduction (4.7 MB → 87 KB gzipped)
- Field name compression (`c`, `n`, `y`, `s` instead of full names)
- Lazy-loaded per institution to minimize initial bundle size
- Update frequency: Quarterly or as needed

**Dynamic Grade Data** (On-demand):
- Real-time fetching from NSD (Norsk senter for forskningsdata) API
- Fetched only when users search for specific courses
- Always up-to-date without requiring application rebuilds
- CORS-handled via proxy layer with multiple fallback mechanisms

This architecture provides:
- Sub-100ms autocomplete response times (static data)
- Fresh grade statistics (dynamic API calls)
- Efficient bandwidth usage (fetch only what's needed)
- Scalability to 100K+ courses without architectural changes

### Data Format Specification

Course data uses a highly optimized JSON structure:

```json
{
  "i": "1240",
  "courses": [
    {
      "c": "TDT4110",
      "n": "Datastrukturer og algoritmer",
      "y": [2025, 2024, 2023],
      "s": 2977
    }
  ]
}
```

- `i`: Institution code (HK-DIR standardized)
- `c`: Course code
- `n`: Course name (optional, omitted if null)
- `y`: Years with available data (sorted descending)
- `s`: Student count for most recent year (optional)

This format achieves:
- 98.2% compression ratio compared to full metadata format
- Human-readable for debugging purposes
- Type-safe parsing with TypeScript interfaces
- Gzip compression handled automatically by server/CDN

### System Components

#### Core Libraries

**`lib/api.ts`** - NSD API Integration Layer
- Multi-tier proxy strategy (Vercel serverless → public CORS proxies → direct calls)
- Automatic fallback mechanisms for reliability
- Environment-aware routing (development vs production vs GitHub Pages)
- Payload construction with type-safe filter generation
- Error handling with retry logic

**`lib/utils.ts`** - Grade Distribution Processing
- `normalizeGradeDistribution()`: Ensures A-F grades always present in university distributions
- `normalizeVGSGradeDistribution()`: Handles 1-6 scale for videregående skole
- `processGradeData()`: Converts raw API data to structured grade distributions
- `processMultiYearData()`: Groups and processes data by year
- `combineAllYears()`: Aggregates multi-year data into single distribution
- `aggregateDuplicateEntries()`: Merges duplicate course instances

**`lib/vgs-grade-data.ts`** - Videregående Skole Integration
- Loads VGS grade statistics from parsed JSON files
- Converts VGS data format to standard GradeData format
- Handles 1-6 grade scale normalization
- Supports course code matching and lookup

**`lib/hierarchy-discovery.ts`** - Generic Course Discovery Engine
- Institution-agnostic hierarchy traversal
- Configurable drilling paths via JSON configuration
- Automatic year-by-year data aggregation (2000-2025)
- Deduplication and merging algorithms
- Supports 40+ institution-specific hierarchy structures

**`lib/course-loader.ts`** - Data Loading Interface
- Client/server-side compatibility layer
- Handles both optimized and legacy data formats
- Gzip decompression support
- Lazy loading with memoization
- Webpack-aware bundling (prevents Node.js modules in client bundle)

**`lib/courses.ts`** - Course Search and Filtering
- Fuzzy matching algorithms for course codes and names
- Institution-scoped search optimization
- Duplicate detection and resolution
- Type-safe query interfaces

#### React Components

**`MultiYearChart`** - Grade Distribution Visualization
- Primary component for displaying karakterfordelinger
- Uses Recharts for interactive bar charts
- Normalized display (A-F or 1-6 grades always shown)
- Multi-year aggregation and year-by-year breakdown
- Responsive design with mobile optimization
- Statistical overlays (mean GPA, student counts)
- Toggle between combined and individual year views

**`GradeChart`** - Single Year Grade Chart
- Simplified chart for single-year distributions
- Consistent styling with MultiYearChart
- Mobile-optimized layout

**`CourseDistributionCard`** - Course Preview Cards
- Displays grade distribution preview on homepage and catalog
- Shows key statistics (mean GPA, total students)
- Click-through to full course details
- Handles both university and VGS courses

**`CourseAutocomplete`** / **`CourseNameAutocomplete`**
- Debounced input (200ms) for performance
- Keyboard navigation (arrow keys, enter, escape)
- Institution-specific data loading
- Accessible ARIA labels and keyboard handlers

**`GPACalculator`**
- Real-time calculation as inputs change
- Support for weighted and unweighted calculations
- Pass/Fail grade handling (Bestått/Ikke bestått)
- Grade scale conversion utilities
- University and VGS grade system support

**`DepartmentBrowser`**
- Hierarchical navigation through institution structures
- Dynamic loading based on user selections
- Breadcrumb navigation
- URL state management

#### Discovery Scripts

40+ TypeScript scripts in `scripts/` for automated course data harvesting:
- `discover-ntnu-courses.ts`, `discover-uio-courses.ts`, etc.
- Generic hierarchy traversal using configuration
- Rate limiting and error handling
- Progress reporting and data validation
- Automated merging and deduplication
- VGS data parsing: `parse-vgs-grade-statistics.ts`, `fetch-vgs-grades-from-api.ts`

## Technology Stack

- **Framework**: Next.js 14 with React 18
- **Language**: TypeScript 5.0+ (strict mode)
- **Build System**: Next.js static export (`output: 'export'`)
- **Styling**: CSS Modules with PostCSS
- **Charts**: Recharts 2.10+
- **Data Fetching**: SWR (stale-while-revalidate)
- **Icons**: Lucide React
- **Deployment**: Static site generation (GitHub Pages compatible)

### Build Configuration

**`next.config.js`** implements sophisticated webpack configuration:
- Environment-aware static export (production only)
- Base path configuration for GitHub Pages deployment
- Node.js module exclusion for client bundles (fs, path, crypto)
- Webpack IgnorePlugin for conditional cache module loading
- Trailing slash configuration for consistent routing

## Supported Institutions

Currently indexed:

- **Universitetet i Oslo (UiO)**: 4,800 courses
- **Norges teknisk-naturvitenskapelige universitet (NTNU)**: 7,643 courses
- **Universitetet i Bergen (UiB)**: 3,361 courses
- **Norges handelshøyskole (NHH)**: 657 courses
- **Videregående skole (VGS)**: High school courses across Norway

**Total**: 16,461+ courses with data spanning 2000-2025

Infrastructure exists for 40+ additional institutions (scripts and configuration ready, data not yet harvested). See `docs/DISCOVERY_COMMANDS.md` for the complete list of available discovery scripts.

## Data Sources and Links

### Primary Data Source

**Norsk senter for forskningsdata (NSD)** - Norwegian Centre for Research Data

- **Main Statistics Portal**: [https://dbh.hkdir.no/tall-og-statistikk/](https://dbh.hkdir.no/tall-og-statistikk/)
- **Direct API Endpoint**: `POST https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData`
- **Student Statistics Page**: [https://dbh.hkdir.no/tall-og-statistikk/statistikk-meny/studenter/statistikk-side/4.1/param?visningId=205](https://dbh.hkdir.no/tall-og-statistikk/statistikk-meny/studenter/statistikk-side/4.1/param?visningId=205)

All course and grade distribution data is publicly available through the NSD API. This application aggregates and presents this data in an accessible format.

### Institution-Specific Links

#### NHH (Norges handelshøyskole) - Code: 1240

**All Courses (All Years)**:
https://dbh.hkdir.no/tall-og-statistikk/statistikk-meny/studenter/statistikk-side/4.1/param?visningId=205&visKode=false&admdebug=false&columns=arstall&hier=insttype%219%21instkode%219%21emnekode&formel=910%218%21912%218%21914%218%21916%218%21918%218%21920%218%21923%218%21925&index=3&sti=Statlige%20vitenskapelige%20h%C3%B8yskoler%219%21Norges%20handelsh%C3%B8yskole%219%21Statlige%20vitenskapelige%20h%C3%B8yskoler%219%21Norges%20handelsh%C3%B8yskole&param=insttype%3D12%219%21dep_id%3D1%219%21nivakode%3Db3%218%21b4%218%21hk%218%21yu%218%21ar%218%21ln%218%21m2%218%21me%218%21mx%218%21hn%218%21m5%218%21pr%219%21instkode%3D1240&binInst=undefined

#### NTNU (Norges teknisk-naturvitenskapelige universitet) - Code: 1150

**All Courses (All Years)**:
https://dbh.hkdir.no/tall-og-statistikk/statistikk-meny/studenter/statistikk-side/4.1/param?visningId=205&visKode=false&admdebug=false&columns=arstall&hier=insttype%219%21instkode%219%21emnekode&formel=910%218%21912%218%21914%218%21916%218%21918%218%21920%218%21923%218%21925&index=3&sti=Universiteter%219%21Norges%20teknisk-naturvitenskapelige%20universitet&param=insttype%3D11%219%21dep_id%3D1%219%21nivakode%3Db3%218%21b4%218%21hk%218%21yu%218%21ar%218%21ln%218%21m2%218%21me%218%21mx%218%21hn%218%21m5%218%21pr%219%21instkode%3D1150&binInst=1101

#### UiO (Universitetet i Oslo) - Code: 1110

**All Courses (All Years)**:
https://dbh.hkdir.no/tall-og-statistikk/statistikk-meny/studenter/statistikk-side/4.1/param?visningId=205&visKode=false&admdebug=false&columns=arstall&hier=insttype%219%21instkode%219%21emnekode&formel=910%218%21912%218%21914%218%21916%218%21918%218%21920%218%21923%218%21925&index=3&sti=Universiteter%219%21Universitetet+i+Oslo&param=insttype%3D11%219%21dep_id%3D1%219%21nivakode%3Db3%218%21b4%218%21hk%218%21yu%218%21ar%218%21ln%218%21m2%218%21me%218%21mx%218%21hn%218%21m5%218%21pr%219%21instkode%3D1110&binInst=1101

#### UiB (Universitetet i Bergen) - Code: 1120

**All Courses (All Years)**:
https://dbh.hkdir.no/tall-og-statistikk/statistikk-meny/studenter/statistikk-side/4.1/param?visningId=205&visKode=false&admdebug=false&columns=arstall&hier=insttype%219%21instkode%219%21emnekode&formel=910%218%21912%218%21914%218%21916%218%21918%218%21920%218%21923%218%21925&index=3&sti=Universiteter%219%21Universitetet%20i%20Bergen&param=insttype%3D11%219%21dep_id%3D1%219%21nivakode%3Db3%218%21b4%218%21hk%218%21yu%218%21ar%218%21ln%218%21m2%218%21me%218%21mx%218%21hn%218%21m5%218%21pr%219%21instkode%3D1120&binInst=1101

### Videregående Skole Data

VGS grade distribution data is sourced from UDIR (Utdanningsdirektoratet) statistics and processed from Excel/CSV exports. The data includes grade distributions for high school courses across Norway using the 1-6 scale.

For detailed information about all data sources and how to discover new institutions, see `docs/DATA_SOURCES.md`.

## API Integration

### NSD API Endpoint

**URL**: `POST https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData`

**Characteristics**:
- No authentication required (public API)
- CORS restrictions (browser requests require proxy)
- Rate limiting (handled via delays in discovery scripts)
- Filter-based query system with complex nested structures

### Proxy Architecture

Three-tier fallback system:

1. **Primary**: Vercel serverless function (`api/proxy.js`)
   - Most reliable, custom CORS headers
   - No rate limiting issues
   - Relative path routing with basePath support

2. **Fallback**: Public CORS proxies
   - `api.allorigins.win`
   - `corsproxy.io`
   - Used when Vercel proxy unavailable (e.g., GitHub Pages deployment)

3. **Direct**: Node.js environment
   - No CORS restrictions in Node.js
   - Used exclusively by discovery scripts
   - Bypasses all proxy layers

For complete API documentation, see `docs/API_REFERENCE.md`.

## Project Structure

```
gpa/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions deployment workflow
├── analytics/                      # Analytics and reporting scripts
│   ├── analytics-report.md
│   ├── institution-analysis-report.md
│   ├── pipeline-report-*.md
│   ├── top-bottom-courses.md
│   └── README.md
├── api/                            # API routes (serverless functions)
│   └── proxy.js                    # CORS proxy handler
├── assets/                         # Design assets (logos, images)
│   ├── dist.svg
│   └── dist.png
├── components/                     # React components
│   ├── BottomSearchBar.tsx        # Bottom search bar component
│   ├── CourseAutocomplete.tsx     # Course code autocomplete
│   ├── CourseCard.tsx             # Course card for homepage
│   ├── CourseDistributionCard.tsx # Grade distribution preview cards
│   ├── CourseExplorer.tsx         # Course exploration interface
│   ├── CourseNameAutocomplete.tsx # Course name autocomplete
│   ├── DepartmentBrowser.tsx      # Hierarchical department browser
│   ├── Footer.tsx                 # Footer component
│   ├── GPACalculator.tsx          # GPA calculator component
│   ├── GradeChart.tsx             # Single year grade chart
│   ├── HomeButton.tsx             # Home navigation button
│   ├── Layout.tsx                 # Main layout wrapper
│   ├── LoadingSkeleton.tsx        # Loading state component
│   ├── MultiYearChart.tsx         # Multi-year grade distribution chart
│   ├── Navbar.tsx                 # Navigation bar
│   ├── ScrollToTop.tsx            # Scroll to top button
│   ├── StatCard.tsx               # Statistics card component
│   ├── VGSCourseAutocomplete.tsx  # VGS course autocomplete
│   └── *.module.css               # Component-specific styles
├── data/                           # Source of truth data files
│   ├── cache.json                 # API response cache
│   ├── institutions/              # Optimized JSON course files
│   │   ├── nhh-all-courses.json
│   │   ├── ntnu-all-courses.json
│   │   ├── uio-all-courses.json
│   │   ├── uib-all-courses.json
│   │   └── [33+ additional institution files]
│   ├── udir-vgs-courses.json      # VGS course catalog
│   ├── vgs-grade-statistics.json  # VGS grade distribution data
│   └── README.md
├── docs/                           # Comprehensive documentation
│   ├── ADDING_COURSES.md          # Guide for adding new courses
│   ├── API_REFERENCE.md           # Complete NSD API documentation
│   ├── API.md                     # API integration guide
│   ├── ARCHITECTURE.md            # System architecture details
│   ├── BUILD_AND_DEPLOYMENT.md    # Deployment procedures
│   ├── CORS_ERRORS_EXPLAINED.md   # CORS troubleshooting
│   ├── CORS_FIX.md                # CORS solution documentation
│   ├── CORS_SOLUTION.md           # CORS implementation details
│   ├── COURSE_CODE_ANALYSIS.md    # Course code format analysis
│   ├── COURSE_FORMAT.md           # Course data format specification
│   ├── DATA_CACHING.md            # Data caching strategy
│   ├── DATA_MANAGEMENT.md         # Data workflows and processes
│   ├── DATA_RETRIEVAL.md          # Data fetching documentation
│   ├── DATA_SOURCES.md            # Data source links and references
│   ├── DATA_STORAGE_OPTIMIZATION.md # Data compression techniques
│   ├── DATA_STORAGE_STRATEGY.md   # Data storage architecture
│   ├── DATA_STRATEGY.md           # Overall data strategy
│   ├── DATA_VALIDATION.md         # Data validation procedures
│   ├── DEPLOYMENT.md              # Deployment guide
│   ├── DISCOVERY_COMMANDS.md      # Course discovery script reference
│   ├── DISCOVERY_STATUS.md        # Discovery script status
│   ├── GITHUB_PAGES_PROXY_SETUP.md # GitHub Pages proxy configuration
│   ├── HIERARCHY_ARCHITECTURE.md  # Hierarchy system architecture
│   ├── HOMEPAGE_DATA_BUILD.md     # Homepage data generation
│   ├── HOW_IT_WORKS.md            # System overview
│   ├── LOGO_AND_BRANDING.md       # Branding guidelines
│   ├── MOBILE_OPTIMIZATION.md     # Mobile optimization details
│   ├── PROJECT_STRUCTURE.md       # Project organization
│   ├── QUICK_CORS_FIX.md          # Quick CORS troubleshooting
│   ├── QUICK_START.md             # Quick start guide
│   ├── README.md                  # Documentation index
│   ├── RECENT_IMPROVEMENTS.md     # Recent changes and updates
│   ├── RUNNING_LOCALLY.md         # Local development guide
│   ├── SETUP_GUIDE.md             # Development environment setup
│   ├── SWITCHING_TO_ACTIONS.md    # GitHub Actions migration
│   ├── TROUBLESHOOTING.md         # Common issues and solutions
│   └── VGS_CACHING.md             # VGS data caching strategy
├── lib/                            # Core library functions
│   ├── all-courses.ts             # Unified course loading
│   ├── api.ts                     # NSD API integration
│   ├── course-loader.ts           # Generic data loader
│   ├── courses.ts                 # Course search and filtering
│   ├── hierarchy-config.ts        # Institution hierarchy configs
│   ├── hierarchy-discovery.ts     # Generic course discovery
│   ├── institutions.ts            # Institution metadata
│   ├── utils.ts                   # Utility functions (grade processing)
│   └── vgs-grade-data.ts          # VGS grade data handling
├── pages/                          # Next.js pages (routes)
│   ├── api/                       # API routes
│   │   ├── proxy.ts               # TypeScript proxy handler
│   │   └── [additional API routes]
│   ├── _app.tsx                   # App wrapper
│   ├── _document.tsx              # Custom document
│   ├── index.tsx                  # Home page (karakterfordelinger overview)
│   ├── kalkulator.tsx             # GPA Calculator page
│   ├── katalog.tsx                # Course catalog page
│   ├── om.tsx                     # About page
│   └── sok.tsx                    # Search page (grade distribution search)
├── public/                         # Static assets (served directly)
│   ├── data/                      # Course data files (copied during build)
│   │   └── institutions/          # Institution course JSON files
│   ├── dist.png                   # Logo (PNG)
│   ├── dist.svg                   # Logo (SVG)
│   ├── favicon.svg                # Favicon
│   ├── proxy-config.json          # Proxy configuration
│   └── wordmark.svg               # Wordmark logo
├── scripts/                        # Utility and discovery scripts
│   ├── analyze-*.ts               # Analysis scripts
│   ├── build-*.ts                 # Data building scripts
│   ├── discover-*.ts              # Course discovery scripts (40+)
│   ├── fetch-*.ts                 # Data fetching scripts
│   ├── fix-*.ts                   # Data fixing scripts
│   ├── normalize-*.ts             # Data normalization scripts
│   ├── optimize-*.ts              # Data optimization scripts
│   ├── parse-*.ts                 # Data parsing scripts
│   ├── populate-*.ts              # Cache population scripts
│   ├── test-*.ts                  # Testing scripts
│   ├── utils/                     # Shared script utilities
│   │   └── export-format.ts      # Export format utilities
│   └── copy-nhh-data.js           # Pre-build data copy script
├── styles/                         # Global styles and CSS modules
│   ├── globals.css                # Global styles
│   ├── Home.module.css            # Home page styles
│   ├── Katalog.module.css         # Catalog page styles
│   ├── Kalkulator.module.css      # Calculator page styles
│   ├── Search.module.css          # Search page styles
│   └── About.module.css           # About page styles
├── types/                          # TypeScript type definitions
│   ├── gpa.ts                     # GPA calculation types
│   └── index.ts                   # Shared types
├── cloudflare-worker-proxy.js     # Cloudflare Worker proxy (alternative)
├── LICENSE                        # MIT License
├── next.config.js                 # Next.js configuration
├── next-env.d.ts                  # Next.js type definitions
├── package.json                   # Dependencies and scripts
├── postcss.config.js              # PostCSS configuration
├── README.md                      # This file
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
└── vercel.json                    # Vercel deployment config
```

## Data Management

### Course Discovery Workflow

The application includes 40+ discovery scripts for harvesting course data from institutions. Each script:

1. Queries DBH year-by-year (2000 → current year)
2. Merges and deduplicates course codes (removing API `-1` suffix)
3. Writes optimized JSON file to `data/institutions/<institution>-all-courses.json`

**Common Discovery Commands**:

```bash
# Harvest course data for major institutions
npm run discover-ntnu      # NTNU - ~15-20 minutes
npm run discover-uio        # UiO - ~10-15 minutes
npm run discover-uib        # UiB - ~10-15 minutes
npm run discover-nhh-all    # NHH - ~5-10 minutes

# Optimize JSON files (compression)
npm run optimize-courses

# Build application
npm run build
```

After running discovery scripts, copy generated JSON files to the public folder:

```bash
cp data/institutions/<file>.json public/data/institutions/
```

For the complete list of all 40+ discovery commands, see `docs/DISCOVERY_COMMANDS.md`.

### Data Optimization

The `optimize-course-json.ts` script applies:
- Field name compression
- Whitespace removal
- Null value elimination
- Array sorting and deduplication
- Metadata stripping

Results: 98.2% size reduction while maintaining full functionality.

### VGS Data Processing

VGS (videregående skole) grade distribution data is processed from UDIR Excel/CSV exports:

```bash
# Parse VGS grade statistics from Excel/CSV
npm run parse-vgs-grades

# Fetch VGS grades from API (alternative method)
npm run fetch-vgs-grades-api
```

The processed data is stored in `data/vgs-grade-statistics.json` and `data/udir-vgs-courses.json`.

## Performance Characteristics

- **Initial Page Load**: < 100 KB JavaScript (after tree-shaking)
- **Course Autocomplete**: < 100ms (static JSON search)
- **Grade Data Fetch**: 1-3 seconds (API call via proxy)
- **Build Time**: 10-30 seconds (static generation)
- **Bundle Size**: Optimized with Next.js automatic code splitting
- **Memory Usage**: Lazy loading prevents loading all institutions simultaneously

## Scalability

### Current Capacity

The architecture supports:
- 16,461 courses (currently indexed)
- 26 years of historical data (2000-2025)
- 714 KB total optimized data (87 KB gzipped)

### Future Scaling Strategies

For expansion beyond 100K courses:

1. **Chunked Loading**: Split files by course code prefix (A-M, N-Z)
2. **Index Separation**: Separate lightweight index from full course data
3. **Binary Format**: Consider MessagePack for additional compression
4. **CDN Distribution**: Leverage CDN edge caching for static assets
5. **Service Workers**: Implement offline support with intelligent caching

## Development

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher (comes with Node.js)
- Git

### Local Development Setup

```bash
# Clone repository
git clone <repository-url>
cd gpa

# Install dependencies
npm install

# Type checking (verify TypeScript compilation)
npm run type-check

# Start development server
npm run dev
```

Development server available at `http://localhost:3000`

### Building for Production

```bash
# Build static site
npm run build
```

Output directory: `out/` (ready for deployment to any static hosting service)

### Available Scripts

**Development**:
- `npm run dev` - Start Next.js development server
- `npm run type-check` - TypeScript type checking without emitting files
- `npm start` - Start production server (requires build first)

**Data Management**:
- `npm run discover-ntnu` - Harvest NTNU courses (2000-2025)
- `npm run discover-uio` - Harvest UiO courses (2000-2025)
- `npm run discover-uib` - Harvest UiB courses (2000-2025)
- `npm run discover-nhh-all` - Harvest NHH courses (2000-2025)
- `npm run optimize-courses` - Optimize JSON course files
- `npm run parse-vgs-grades` - Parse VGS grade statistics
- `npm run fetch-vgs-grades-api` - Fetch VGS grades from API

**Testing**:
- `npm run test-hierarchy` - Test hierarchy discovery system
- `npm run test-fetch` - Test API fetching functionality

40+ additional discovery scripts available for other institutions (see `package.json` and `docs/DISCOVERY_COMMANDS.md`).

## Security Considerations

- **Static Site**: No server-side code execution in production
- **No Database**: No database connections or sensitive data storage
- **Public API**: All data sources are publicly available
- **CORS Handling**: Proper proxy implementation prevents CORS issues
- **Type Safety**: TypeScript strict mode prevents common vulnerabilities
- **Dependency Management**: Regular updates via npm audit

## Browser Support

- Modern browsers with ES2020+ support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile browsers: iOS Safari 14+, Chrome Mobile 90+
- Internet Explorer: Not supported

## Deployment

The application is configured for static site generation and can be deployed to:

- **GitHub Pages** (current deployment)
- Vercel
- Netlify
- Any static hosting service (AWS S3, Cloudflare Pages, etc.)

Deployment workflow:
1. Build static site (`npm run build`)
2. Deploy `out/` directory contents
3. Configure base path if necessary (`/gpa` for GitHub Pages)

See `docs/BUILD_AND_DEPLOYMENT.md` for detailed deployment instructions.

## Documentation

Comprehensive documentation available in `docs/`:

- **ARCHITECTURE.md** - System architecture and design decisions
- **API_REFERENCE.md** - Complete NSD API documentation
- **DATA_MANAGEMENT.md** - Course data harvesting and optimization workflows
- **DATA_SOURCES.md** - Data source links and discovery procedures
- **DATA_STORAGE_STRATEGY.md** - Data format specifications and optimization techniques
- **BUILD_AND_DEPLOYMENT.md** - Deployment procedures
- **DISCOVERY_COMMANDS.md** - Complete reference of all discovery scripts
- **TROUBLESHOOTING.md** - Common issues and solutions
- **SETUP_GUIDE.md** - Development environment setup
- **QUICK_START.md** - Quick start guide for users and developers

## Contributing

This is an open-source project. Contributions welcome:

1. Follow existing code style and TypeScript conventions
2. Add comprehensive type definitions for new features
3. Update relevant documentation
4. Test changes across supported browsers
5. Ensure build succeeds (`npm run build`)

## Data Sources and Attribution

Course and grade distribution data provided by:

- **Norsk senter for forskningsdata (NSD)** - Norwegian Centre for Research Data
  - API: `https://dbh.hkdir.no/api/`
  - Statistics Portal: `https://dbh.hkdir.no/tall-og-statistikk/`

- **Utdanningsdirektoratet (UDIR)** - Directorate for Education
  - VGS grade statistics and course data

All course data is publicly available through these sources. This application aggregates and presents this data in an accessible format for students and educators.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Technical Highlights

### Data Compression

Achieved 98.2% size reduction through:
- Field name optimization (4 characters vs 15+ characters)
- Removal of redundant metadata
- Compact JSON serialization (no whitespace)
- Automatic gzip compression

### Generic Hierarchy System

Single codebase supports 40+ institutions with different organizational structures:
- Configurable hierarchy traversal
- Institution-specific variable name mapping
- Automatic course discovery without code changes
- Extensible configuration system

### Proxy Resilience

Multi-tier proxy architecture ensures reliability:
- Primary Vercel serverless function
- Automatic fallback to public proxies
- Direct Node.js calls for scripts
- Environment-aware routing

### Type Safety

Comprehensive TypeScript coverage:
- Strict mode enabled
- Type-safe API interfaces
- Generic types for reusable components
- Compile-time error checking

### Grade Distribution Processing

Sophisticated grade distribution handling:
- Automatic normalization (A-F or 1-6 scales)
- Duplicate entry aggregation
- Multi-year data combination
- Pass/Fail conditional display
- Statistical calculation (mean GPA, percentages)

## Future Enhancements

Potential improvements and planned features:

- Additional institution support (40+ configured, data harvesting pending)
- Advanced filtering (department, faculty, year ranges)
- Course comparison tools (side-by-side grade distributions)
- Historical trend analysis (grade inflation/deflation over time)
- Export functionality (PDF reports, CSV downloads)
- Service worker implementation (offline support)
- Performance monitoring and analytics
- Enhanced VGS data coverage
- Real-time data updates via webhooks

## Version History

Current version focuses on:
- Complete course data for 4 major institutions + VGS
- Comprehensive grade distribution visualization (karakterfordelinger)
- University and high school GPA calculators
- Optimized data storage (98.2% compression)
- Comprehensive documentation
- Scalable architecture for future expansion

See git history for detailed version information.
