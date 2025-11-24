# Norwegian GPA Calculator

A production-grade web application for calculating Grade Point Average (GPA) and analyzing grade distribution statistics for Norwegian higher education institutions. Built with Next.js 14, TypeScript, and a sophisticated hybrid data architecture.

**Live Application**: [https://egil10.github.io/gpa/](https://egil10.github.io/gpa/)

## Overview

This repository implements a comprehensive system for aggregating, processing, and visualizing academic grade data from Norwegian universities and high schools. The application serves over 16,000 course records spanning 26 years (2000-2025) across four major institutions, with an extensible architecture supporting 40+ additional institutions.

### Core Capabilities

- **GPA Calculation**: University-scale (A=5, B=4, C=3, D=2, E=1, F=0) and videregående skole calculations
- **Grade Distribution Analysis**: Real-time statistical analysis of course grading patterns
- **Course Discovery**: Advanced search and autocomplete across institutional boundaries
- **Data Visualization**: Interactive multi-year grade distribution charts with normalization
- **Institutional Hierarchy Navigation**: Generic system supporting complex organizational structures

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

**`CourseAutocomplete`** / **`CourseNameAutocomplete`**
- Debounced input (200ms) for performance
- Keyboard navigation (arrow keys, enter, escape)
- Institution-specific data loading
- Accessible ARIA labels and keyboard handlers

**`MultiYearChart`**
- Grade distribution visualization using Recharts
- Normalized display (A-F grades always shown, even with zero counts)
- Multi-year aggregation and year-by-year breakdown
- Responsive design with mobile optimization
- Statistical overlays (mean GPA, student counts)

**`GPACalculator`**
- Real-time calculation as inputs change
- Support for weighted and unweighted calculations
- Pass/Fail grade handling (Bestått/Ikke bestått)
- Grade scale conversion utilities

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

**Total**: 16,461 courses with data spanning 2000-2025

Infrastructure exists for 40+ additional institutions (scripts and configuration ready, data not yet harvested).

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

## Data Management

### Course Discovery Workflow

```bash
# Harvest course data for an institution
npm run discover-ntnu      # NTNU - ~15-20 minutes
npm run discover-uio       # UiO - ~10-15 minutes
npm run discover-uib       # UiB - ~10-15 minutes
npm run discover-nhh-all   # NHH - ~5-10 minutes

# Optimize JSON files (compression)
npm run optimize-courses

# Build application
npm run build
```

Discovery scripts:
- Fetch data year-by-year (2000-2025)
- Merge and deduplicate courses
- Export to optimized JSON format
- Save to `data/institutions/*.json`
- Automatically copied to `public/` during build via prebuild script

### Data Optimization

The `optimize-course-json.ts` script applies:
- Field name compression
- Whitespace removal
- Null value elimination
- Array sorting and deduplication
- Metadata stripping

Results: 98.2% size reduction while maintaining full functionality.

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

**Testing**:
- `npm run test-hierarchy` - Test hierarchy discovery system
- `npm run test-fetch` - Test API fetching functionality

40+ additional discovery scripts available for other institutions (see `package.json`).

## Project Structure

```
gpa/
├── api/                      # API routes (serverless functions)
│   └── proxy.js              # CORS proxy handler
├── components/               # React components
│   ├── CourseAutocomplete.tsx
│   ├── CourseNameAutocomplete.tsx
│   ├── DepartmentBrowser.tsx
│   ├── GPACalculator.tsx
│   ├── MultiYearChart.tsx
│   └── [additional components]
├── data/                     # Source of truth data files
│   └── institutions/         # Optimized JSON course files
│       ├── nhh-all-courses.json
│       ├── ntnu-all-courses.json
│       ├── uio-all-courses.json
│       └── uib-all-courses.json
├── docs/                     # Comprehensive documentation
│   ├── ARCHITECTURE.md       # System architecture details
│   ├── API_REFERENCE.md      # NSD API documentation
│   ├── DATA_MANAGEMENT.md    # Data workflows
│   └── [additional docs]
├── lib/                      # Core library functions
│   ├── api.ts                # NSD API integration
│   ├── courses.ts            # Course search and filtering
│   ├── hierarchy-discovery.ts # Generic course discovery
│   ├── hierarchy-config.ts   # Institution hierarchy configs
│   ├── course-loader.ts      # Generic data loader
│   └── utils.ts              # Utility functions
├── pages/                    # Next.js pages (routes)
│   ├── _app.tsx              # App wrapper
│   ├── _document.tsx         # Custom document
│   ├── index.tsx             # Home page
│   ├── kalkulator.tsx        # GPA Calculator page
│   ├── sok.tsx               # Search page
│   └── om.tsx                # About page
├── scripts/                  # Utility and discovery scripts
│   ├── discover-*.ts         # Course discovery scripts
│   ├── optimize-course-json.ts
│   └── utils/                # Shared script utilities
├── styles/                   # Global styles and CSS modules
├── types/                    # TypeScript type definitions
│   ├── index.ts              # Shared types
│   └── gpa.ts                # GPA calculation types
├── next.config.js            # Next.js configuration
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── vercel.json               # Vercel deployment config
```

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
- **DATA_STORAGE_STRATEGY.md** - Data format specifications and optimization techniques
- **BUILD_AND_DEPLOYMENT.md** - Deployment procedures
- **TROUBLESHOOTING.md** - Common issues and solutions
- **SETUP_GUIDE.md** - Development environment setup

## Contributing

This is an open-source project. Contributions welcome:

1. Follow existing code style and TypeScript conventions
2. Add comprehensive type definitions for new features
3. Update relevant documentation
4. Test changes across supported browsers
5. Ensure build succeeds (`npm run build`)

## Data Sources and Attribution

Course and grade data provided by:
- **Norsk senter for forskningsdata (NSD)** - Norwegian Centre for Research Data
- API: `https://dbh.hkdir.no/api/`
- Statistics Portal: `https://dbh.hkdir.no/tall-og-statistikk/`

All course data is publicly available through the NSD API. This application aggregates and presents this data in an accessible format.

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

## Future Enhancements

Potential improvements and planned features:

- Additional institution support (40+ configured, data harvesting pending)
- Advanced filtering (department, faculty, year ranges)
- Course comparison tools (side-by-side grade distributions)
- Historical trend analysis (grade inflation/deflation over time)
- Export functionality (PDF reports, CSV downloads)
- Service worker implementation (offline support)
- Performance monitoring and analytics

## Version History

Current version focuses on:
- Complete course data for 4 major institutions
- Grade distribution visualization
- University and high school GPA calculators
- Optimized data storage (98.2% compression)
- Comprehensive documentation
- Scalable architecture for future expansion

See git history for detailed version information.
