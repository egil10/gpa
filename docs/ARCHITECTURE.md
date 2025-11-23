# System Architecture

Complete overview of the GPA Calculator system architecture and design decisions.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                       │
├─────────────────────────────────────────────────────────┤
│  React Components (Next.js)                              │
│  ├── Search Page (/sok)                                  │
│  ├── Calculator Page (/kalkulator)                       │
│  ├── Home Page (/)                                       │
│  └── About Page (/om)                                    │
│                                                           │
│  ┌────────────────────────────────────────────┐          │
│  │  Static Course Lists (JSON)                 │          │
│  │  - Autocomplete (fast, local)               │          │
│  │  - Loaded from public/*.json                │          │
│  └────────────────────────────────────────────┘          │
│                                                           │
│  ┌────────────────────────────────────────────┐          │
│  │  Dynamic Grade Data (API)                   │          │
│  │  - Fetched on-demand                        │          │
│  │  - Via proxy (CORS handling)                │          │
│  └────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    PROXY LAYER                            │
│  (Vercel Serverless Function or Public Proxy)            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 NSD API (External)                        │
│  https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData    │
└─────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
gpa/
├── components/              # React components
│   ├── CourseAutocomplete.tsx
│   ├── CourseNameAutocomplete.tsx
│   ├── DepartmentBrowser.tsx
│   ├── GPACalculator.tsx
│   ├── MultiYearChart.tsx
│   └── VGSCourseAutocomplete.tsx
│
├── data/                   # Data files (source of truth)
│   └── institutions/       # Course JSON files (optimized)
│       ├── nhh-all-courses.json
│       ├── ntnu-all-courses.json
│       ├── uio-all-courses.json
│       └── uib-all-courses.json
│
├── lib/                    # Core libraries
│   ├── api.ts              # NSD API integration
│   ├── courses.ts          # Course search and data
│   ├── course-loader.ts    # Generic course loader
│   ├── hierarchy-discovery.ts  # Generic hierarchy discovery
│   ├── hierarchy-config.ts     # Institution hierarchy configs
│   ├── nhh-courses.ts      # NHH-specific loader
│   ├── utils.ts            # Utility functions
│   └── cache.ts            # Caching (server-side only)
│
├── pages/                  # Next.js pages
│   ├── _app.tsx            # App wrapper
│   ├── index.tsx           # Home page
│   ├── kalkulator.tsx      # GPA Calculator
│   ├── sok.tsx             # Search page
│   └── om.tsx              # About page
│
├── public/                 # Static assets (generated)
│   ├── *.json              # Course data (copied during build)
│   └── ...                 # Other static files
│
├── scripts/                # Utility scripts
│   ├── discover-*.ts       # Course discovery scripts
│   ├── optimize-course-json.ts  # Data optimization
│   ├── copy-nhh-data.js    # Pre-build script
│   └── utils/
│       └── export-format.ts     # Shared export utilities
│
├── docs/                   # Documentation
│   ├── README.md           # Documentation index
│   ├── SETUP_GUIDE.md      # Setup instructions
│   ├── DATA_MANAGEMENT.md  # Data workflows
│   ├── API_REFERENCE.md    # API documentation
│   ├── BUILD_AND_DEPLOYMENT.md  # Deployment guide
│   └── TROUBLESHOOTING.md  # Common issues
│
├── api/                    # API routes (Vercel)
│   └── proxy.js            # CORS proxy
│
├── types/                  # TypeScript types
│   └── index.ts            # Shared type definitions
│
├── next.config.js          # Next.js configuration
├── package.json            # Project configuration
├── tsconfig.json           # TypeScript configuration
└── vercel.json             # Vercel configuration
```

## 🔄 Data Flow

### 1. Course Discovery Flow

```
Discovery Script (Node.js)
    ↓
Fetch from NSD API (year-by-year: 2000-2025)
    ↓
Merge and deduplicate courses
    ↓
Export optimized JSON format
    ↓
Save to data/institutions/*.json
    ↓
Copy to public/*.json (during build)
    ↓
Available for autocomplete (client-side)
```

### 2. Course Search Flow

```
User types in autocomplete
    ↓
Load course list from static JSON (public/*.json)
    ↓
Filter courses (by code/name)
    ↓
Display suggestions
    ↓
User selects course
    ↓
Fetch grade data from NSD API (via proxy)
    ↓
Process grade data (normalize, combine years)
    ↓
Display charts (Recharts)
```

### 3. Grade Data Fetch Flow

```
User searches for course
    ↓
Create API payload (filters)
    ↓
Call fetchWithProxy()
    ↓
Try Vercel proxy first
    ↓ (if fails)
Try public CORS proxies
    ↓ (if fails)
Direct API call (Node.js only)
    ↓
Return grade data
    ↓
Process and display
```

## 🗂️ Data Storage Strategy

### Hybrid Approach

**Static Course Lists**:
- **What**: Course codes and names for autocomplete
- **Format**: Optimized JSON (98% smaller)
- **Location**: `public/*.json` (copied from `data/institutions/`)
- **Update**: Manual (quarterly or as needed)
- **Size**: ~700 KB total for 16,461 courses

**Dynamic Grade Data**:
- **What**: Grade distribution statistics
- **Source**: NSD API (real-time)
- **Update**: On-demand when user searches
- **Size**: Only fetched when needed

### Optimization

1. **Field Name Compression**: `c`, `n`, `y`, `s` instead of full names
2. **Removed Redundancy**: No metadata, only essential data
3. **Compact JSON**: No whitespace
4. **Gzip Compression**: Server handles automatically

**Result**: 4.7 MB → 87 KB (98.2% reduction)

## 🧩 Key Components

### Core Libraries

#### `lib/api.ts`
- NSD API integration
- Proxy handling (Vercel + fallbacks)
- Payload creation
- Error handling

#### `lib/hierarchy-discovery.ts`
- Generic course discovery
- Works with different institution hierarchies
- Year-by-year fetching
- Data merging

#### `lib/course-loader.ts`
- Generic course data loader
- Handles optimized and legacy formats
- Client/server-side compatible
- Gzip support

### React Components

#### `CourseNameAutocomplete`
- Course search by name
- Institution-specific loading
- Duplicate detection
- Keyboard navigation

#### `MultiYearChart`
- Grade distribution visualization
- Multiple year support
- Normalized grade display (A-F always shown)
- Responsive charts

#### `GPACalculator`
- GPA calculation for university and VGS
- Course grade input
- Real-time calculation
- Grade conversion

## 🔌 API Integration

### NSD API

**Endpoint**: `POST https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData`

**Features**:
- No authentication required
- CORS restrictions (requires proxy)
- Rate limiting (handled with delays)
- Filter-based queries

### Proxy Strategy

1. **Primary**: Vercel serverless function (`api/proxy.js`)
   - Most reliable
   - No rate limits
   - Custom CORS headers

2. **Fallback**: Public CORS proxies
   - `api.allorigins.win`
   - `corsproxy.io`
   - Less reliable, but works if Vercel unavailable

3. **Direct**: Node.js scripts
   - No CORS in Node.js
   - Used by discovery scripts
   - Bypasses proxies entirely

## 🎨 Frontend Architecture

### Next.js Setup

- **Framework**: Next.js 14 with React 18
- **Export**: Static export (`output: 'export'`)
- **Routing**: File-based routing
- **Styling**: CSS Modules
- **State**: React hooks (useState, useEffect)

### Key Design Decisions

1. **Static Export**: 
   - No server required
   - Can deploy anywhere
   - Faster page loads
   - Lower hosting costs

2. **Hybrid Data**:
   - Fast autocomplete (static)
   - Fresh grade data (dynamic)
   - Best of both worlds

3. **Component Structure**:
   - Reusable components
   - Clear separation of concerns
   - Type-safe with TypeScript

## 🔐 Security

### Static Site Security

- ✅ No server-side code execution
- ✅ No database connections
- ✅ No sensitive data storage
- ✅ All data is public (course info)

### API Security

- ✅ No authentication needed (public API)
- ✅ CORS handled via proxy
- ✅ No sensitive data transmitted
- ✅ Client-side only API calls

## 📊 Performance Optimizations

1. **Optimized JSON Format**: 98% size reduction
2. **Lazy Loading**: Course lists loaded per institution
3. **Code Splitting**: Next.js automatic code splitting
4. **Static Generation**: Pre-rendered pages
5. **Image Optimization**: Unoptimized (for static export)
6. **Debouncing**: Search input debounced (200ms)

## 🔄 Update Workflow

### Regular Updates (Quarterly)

```
1. Run discovery scripts
   ↓
2. Review data changes
   ↓
3. Commit to git
   ↓
4. Build project
   ↓
5. Deploy
```

### Emergency Updates

```
1. Fix issue
   ↓
2. Test locally
   ↓
3. Build and verify
   ↓
4. Deploy immediately
```

## 🧪 Testing Strategy

### Manual Testing

- Course search functionality
- Grade data display
- Calculator accuracy
- Cross-browser compatibility

### Automated Testing (Future)

- Unit tests for calculations
- Integration tests for API calls
- E2E tests for user flows

## 📈 Scalability

### Current Capacity

- **Courses**: 16,461 (easily handles 100K+)
- **File Size**: 714 KB (optimized)
- **Years**: 26 years (2000-2025)

### Future Scaling

If data grows significantly:
1. **Chunking**: Split files by prefix (A-M, N-Z)
2. **Indexing**: Separate index and full data
3. **Binary Format**: MessagePack for even smaller files
4. **CDN**: Use CDN for static assets

## 🔗 Dependencies

### Core Dependencies

- **next**: React framework
- **react**: UI library
- **typescript**: Type safety
- **recharts**: Chart visualization
- **swr**: Data fetching

### Development Dependencies

- **tsx**: Run TypeScript directly
- **@types/node**: Node.js types
- **@types/react**: React types

## 🎯 Design Principles

1. **Simplicity**: Keep it simple and maintainable
2. **Performance**: Optimize for speed and size
3. **Reliability**: Handle errors gracefully
4. **Scalability**: Design for growth
5. **Documentation**: Comprehensive documentation

## 🔮 Future Enhancements

### Potential Improvements

1. **More Institutions**: Add more Norwegian universities
2. **Better Caching**: Service worker for offline support
3. **Advanced Filters**: Filter by department, year, etc.
4. **Export Features**: Export calculations to PDF
5. **Comparisons**: Compare courses across institutions
6. **Historical Trends**: Show trends over time

### Technical Debt

1. Remove unused cache functionality (or fully implement)
2. Add comprehensive testing
3. Improve error handling
4. Add loading states
5. Optimize bundle sizes further

## 📚 Related Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Initial setup
- [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md) - Data workflows
- [API_REFERENCE.md](./API_REFERENCE.md) - API details
- [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) - Deployment
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
