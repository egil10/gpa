# Norwegian GPA Calculator

A comprehensive web application for calculating Grade Point Average (GPA) for Norwegian universities and high schools (videregående skole). The application provides grade distribution statistics and course search functionality for major Norwegian higher education institutions.

## Overview

This project enables students to:

- Calculate GPA for university and high school courses
- Search grade distribution statistics for courses at major Norwegian institutions
- View historical grade data spanning multiple years
- Browse courses by institution, faculty, and department
- Compare course difficulty based on grade distributions

## Supported Institutions

The application currently supports course data from:

- **Universitetet i Oslo (UiO)** - 4,800 courses
- **Norges teknisk-naturvitenskapelige universitet (NTNU)** - 7,643 courses
- **Universitetet i Bergen (UiB)** - 3,361 courses
- **Norges handelshøyskole (NHH)** - 657 courses

Total: 16,461 courses with data spanning from 2000 to 2025.

## Features

### GPA Calculator

- Calculate GPA for university courses using the Norwegian scale (A=5, B=4, C=3, D=2, E=1, F=0)
- Calculate GPA for high school courses (videregående skole)
- Support for weighted and unweighted calculations
- Real-time calculation as courses are added or removed
- Support for "Bestått/Ikke bestått" (Pass/Fail) grades

### Course Search

- Search by course code or course name
- Autocomplete functionality with course suggestions
- Institution-specific course lists
- Grade distribution visualization with interactive charts
- Multi-year data display with combined and year-by-year views
- Department and faculty browsing for larger institutions

### Grade Statistics

- Grade distribution charts showing A-F percentages
- Student count statistics per year
- Historical data from 2000 to 2025
- Average GPA calculations for courses
- Consistent visualization format across all courses

## Technology Stack

- **Framework**: Next.js 14 with React 18
- **Language**: TypeScript
- **Styling**: CSS Modules
- **Charts**: Recharts
- **Data Fetching**: SWR for API calls
- **Icons**: Lucide React
- **Deployment**: Static export (GitHub Pages compatible)

## Project Structure

```
gpa/
├── components/           # React components
│   ├── GPACalculator.tsx
│   ├── CourseAutocomplete.tsx
│   ├── CourseNameAutocomplete.tsx
│   ├── MultiYearChart.tsx
│   ├── DepartmentBrowser.tsx
│   └── VGSCourseAutocomplete.tsx
├── data/
│   └── institutions/     # Course JSON files (optimized format)
├── lib/                  # Core libraries
│   ├── api.ts            # NSD API integration
│   ├── courses.ts        # Course search and data
│   ├── hierarchy-discovery.ts  # Generic course discovery
│   └── utils.ts          # Utility functions
├── pages/                # Next.js pages
│   ├── index.tsx         # Home page
│   ├── kalkulator.tsx    # GPA Calculator
│   ├── sok.tsx           # Search page
│   └── om.tsx            # About page
├── scripts/              # Utility scripts
│   ├── discover-*.ts     # Course discovery scripts
│   └── optimize-course-json.ts
├── docs/                 # Comprehensive documentation
└── public/               # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gpa
```

2. Install dependencies:
```bash
npm install
```

3. Verify installation:
```bash
npm run type-check
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

### Building for Production

Build the static site:
```bash
npm run build
```

The built files will be in the `out/` directory, ready for deployment to any static hosting service.

## Data Management

### Course Data

Course data is stored in optimized JSON format in `data/institutions/`. These files are automatically copied to the `public/` directory during the build process.

Current course data files:
- `nhh-all-courses.json` - NHH courses (27 KB, 657 courses)
- `ntnu-all-courses.json` - NTNU courses (337 KB, 7,643 courses)
- `uio-all-courses.json` - UiO courses (203 KB, 4,800 courses)
- `uib-all-courses.json` - UiB courses (147 KB, 3,361 courses)

### Updating Course Data

To update course data from the NSD API:

```bash
# Update all institutions (takes 30-60 minutes)
npm run discover-nhh-all   # NHH - 5-10 minutes
npm run discover-ntnu      # NTNU - 15-20 minutes
npm run discover-uio       # UiO - 10-15 minutes
npm run discover-uib       # UiB - 10-15 minutes

# Then build
npm run build
```

For detailed instructions, see `docs/DATA_MANAGEMENT.md`

### Data Sources

Course data is fetched from the Norwegian Centre for Research Data (NSD) API. Specific NSD website links used for discovery are documented in `docs/DATA_SOURCES.md`.

## Architecture

### Hybrid Data Strategy

The application uses a hybrid approach combining static and dynamic data:

**Static Course Lists** (Pre-fetched):
- Course codes and names for autocomplete
- Stored in optimized JSON format (98% size reduction)
- Loaded instantly when users search
- Updated quarterly or as needed

**Dynamic Grade Data** (Real-time):
- Grade distribution statistics
- Fetched from NSD API when users search for a course
- Always up-to-date
- Only fetched when needed

This approach provides:
- Fast autocomplete (no API delay)
- Fresh grade data (real-time API calls)
- Efficient data usage (only fetch what's needed)
- Scalable architecture (can handle 100K+ courses)

### Data Flow

1. User types in autocomplete → Load course list from static JSON (fast)
2. User selects course → Fetch grade data from NSD API (via proxy)
3. Display results → Show grade distribution charts

For detailed architecture information, see `docs/ARCHITECTURE.md`

## API Integration

The application integrates with the NSD (Norsk senter for forskningsdata) API to fetch grade distribution data.

**API Endpoint**: `https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData`

**Key Features**:
- Proxy layer to handle CORS restrictions
- Fallback mechanisms for reliability
- Direct API calls in Node.js environments
- Error handling and retry logic

For complete API documentation, see `docs/API_REFERENCE.md`

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run type-check` - Type check TypeScript without emitting files
- `npm start` - Start production server (requires build first)

### Building
- `npm run build` - Build production static site
- `npm run export` - Alias for build (for Next.js static export)

### Data Management
- `npm run discover-nhh-all` - Fetch all NHH courses (2000-2025)
- `npm run discover-ntnu` - Fetch all NTNU courses (2000-2025)
- `npm run discover-uio` - Fetch all UiO courses (2000-2025)
- `npm run discover-uib` - Fetch all UiB courses (2000-2025)
- `npm run optimize-courses` - Optimize course JSON files

### Testing
- `npm run test-hierarchy` - Test hierarchy discovery system
- `npm run test-fetch` - Test API fetching functionality

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **README.md** (this file) - Project overview
- **SETUP_GUIDE.md** - Complete setup instructions
- **DATA_SOURCES.md** - Specific NSD website links used for data discovery
- **DATA_MANAGEMENT.md** - How to fetch and manage course data
- **DATA_STORAGE_STRATEGY.md** - Data storage architecture and optimization
- **BUILD_AND_DEPLOYMENT.md** - Building and deploying the website
- **API_REFERENCE.md** - Complete API documentation
- **ARCHITECTURE.md** - System architecture overview
- **TROUBLESHOOTING.md** - Common issues and solutions

## Deployment

The application is configured for static site generation and can be deployed to:

- GitHub Pages
- Vercel
- Netlify
- Any static hosting service

See `docs/BUILD_AND_DEPLOYMENT.md` for detailed deployment instructions.

## Configuration

### Next.js Configuration

The project uses static export configuration in `next.config.js`:

```javascript
{
  output: 'export',        // Static site generation
  basePath: '/gpa',        // Base path for deployment
  images: { unoptimized: true },  // Required for static export
}
```

### Environment Variables

Currently, no environment variables are required. The application uses public APIs and static data files.

## Contributing

This is a personal project, but suggestions and improvements are welcome. When contributing:

1. Follow the existing code style
2. Add TypeScript types for all new code
3. Update documentation as needed
4. Test your changes thoroughly

## Data Sources and Credits

Course and grade data is provided by:
- **Norsk senter for forskningsdata (NSD)** - Norwegian Centre for Research Data
- API: https://dbh.hkdir.no/api/
- Statistics Portal: https://dbh.hkdir.no/tall-og-statistikk/

All course data is publicly available through the NSD API.

## License

See LICENSE file for details.

## Support

For issues, questions, or contributions:

1. Check the documentation in the `docs/` directory
2. Review `docs/TROUBLESHOOTING.md` for common issues
3. Check existing issues (if applicable)

## Project Status

Current Status: Active Development

Last Major Update: Course data fetching and optimization system implemented

Future Plans:
- Add more Norwegian institutions
- Improve grade distribution visualizations
- Add course comparison features
- Implement historical trend analysis

## Technical Details

### Data Format

Course data is stored in optimized JSON format:

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

This format achieves 98% size reduction compared to the original format while maintaining all functionality.

### Performance

- Initial page load: < 100 KB JavaScript
- Course search: Instant (from static JSON)
- Grade data fetch: 1-3 seconds (API call)
- Build time: 10-30 seconds

### Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- No Internet Explorer support

## Version History

### Current Version

- Full course data for 4 major institutions
- Grade distribution visualization
- GPA calculator for university and high school
- Optimized data storage (98% compression)
- Comprehensive documentation

See git history for detailed version information.
