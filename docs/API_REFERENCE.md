# API Reference

Complete reference for the NSD (Norsk senter for forskningsdata) API integration and internal APIs.

## 🌐 NSD API Overview

The project uses the Norwegian Centre for Research Data (NSD) API to fetch grade distribution statistics.

**Statistics Portal**: https://dbh.hkdir.no/tall-og-statistikk/statistikk-meny/studenter/statistikk-side/4.1/param?visningId=205

**Base URL**: `https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData`

**API Endpoint**: `POST /api/Tabeller/hentJSONTabellData`

> 💡 **See [DATA_SOURCES.md](./DATA_SOURCES.md) for specific institution links and how to find data sources!**

### Authentication

- ✅ **No authentication required** (public API)
- ⚠️ **CORS restrictions** in browser (requires proxy)

## 📡 API Endpoint Details

### Request

**Method**: `POST`

**Headers**:
```http
Content-Type: application/json
```

**Body** (JSON):
```json
{
  "tabell_id": 308,
  "api_versjon": 1,
  "statuslinje": "N",
  "begrensning": "1000",
  "kodetekst": "N",
  "desimal_separator": ".",
  "groupBy": ["Institusjonskode", "Emnekode", "Karakter", "Årstall"],
  "sortBy": ["Emnekode", "Karakter"],
  "filter": [
    {
      "variabel": "Institusjonskode",
      "selection": {
        "filter": "item",
        "values": ["1110"]
      }
    },
    {
      "variabel": "Emnekode",
      "selection": {
        "filter": "item",
        "values": ["TDT4110"]
      }
    }
  ]
}
```

### Response

**Success** (200 OK):
```json
[
  {
    "Institusjonskode": "1150",
    "Emnekode": "TDT4110",
    "Karakter": "A",
    "Årstall": "2024",
    "Antall kandidater totalt": "252"
  },
  ...
]
```

**No Data** (204 No Content):
- Empty response body
- Means no data matches filters

**Error** (400/500):
```json
{
  "error": "Error message"
}
```

## 🔧 Filter Variables

### Common Variables

| Variable | Description | Example Values |
|----------|-------------|----------------|
| `Institusjonskode` | Institution code | `1110` (UiO), `1150` (NTNU) |
| `Emnekode` | Course code | `TDT4110`, `IN2010` |
| `Årstall` | Year | `2024`, `2023` |
| `Karakter` | Grade | `A`, `B`, `C`, `D`, `E`, `F`, `Bestått`, `Ikke bestått` |
| `Fakkode` | Faculty code | (UiO only) |
| `Ufakkode` | Department code | (UiO only) |
| `Studkode` | Studium code | (NHH only) |
| `Progkode` | Program code | (NHH only) |

### Institution Codes

| Code | Name |
|------|------|
| 1110 | Universitetet i Oslo (UiO) |
| 1120 | Universitetet i Bergen (UiB) |
| 1150 | Norges teknisk-naturvitenskapelige universitet (NTNU) |
| 1240 | Norges handelshøyskole (NHH) |

## 📚 Internal API Functions

### Core Functions (`lib/api.ts`)

#### `fetchGradeData()`

Fetch grade data for a specific course.

```typescript
async function fetchGradeData(
  institutionCode: string,
  courseCode: string,
  year?: number,
  departmentFilter?: DepartmentFilter
): Promise<GradeData[]>
```

**Example**:
```typescript
const data = await fetchGradeData('1150', 'TDT4110', 2024);
// Returns array of grade distribution data
```

#### `fetchAllYearsData()`

Fetch grade data for all available years.

```typescript
async function fetchAllYearsData(
  institutionCode: string,
  courseCode: string
): Promise<Record<number, GradeData[]>>
```

**Example**:
```typescript
const allYears = await fetchAllYearsData('1150', 'TDT4110');
// Returns { 2024: [...], 2023: [...], ... }
```

#### `fetchWithProxy()`

Fetch data using proxy (handles CORS).

```typescript
async function fetchWithProxy(
  payload: SearchPayload,
  proxyIndex?: number,
  useVercelProxy?: boolean
): Promise<GradeData[]>
```

**Features**:
- Tries Vercel proxy first (if available)
- Falls back to public CORS proxies
- Direct API call in Node.js environment

### Hierarchy Discovery (`lib/hierarchy-discovery.ts`)

#### `getAllCoursesForInstitution()`

Get all courses for an institution in a given year.

```typescript
async function getAllCoursesForInstitution(
  institutionCode: string,
  year?: number
): Promise<DiscoveredCourse[]>
```

**Example**:
```typescript
const courses = await getAllCoursesForInstitution('1150', 2024);
// Returns array of all NTNU courses from 2024
```

#### `discoverCoursesAtPath()`

Discover courses with specific filters.

```typescript
async function discoverCoursesAtPath(
  institutionCode: string,
  pathFilters?: Record<string, string[]>,
  year?: number
): Promise<DiscoveredCourse[]>
```

**Example**:
```typescript
const courses = await discoverCoursesAtPath('1110', {
  'Fakkode': ['260'],  // Faculty filter
  'Ufakkode': ['250']  // Department filter
}, 2024);
```

## 🔄 Data Flow

### Course Search Flow

```
User types in autocomplete
    ↓
Load course list from static JSON (fast)
    ↓
Display matching courses
    ↓
User selects course
    ↓
Fetch grade data from NSD API (via proxy)
    ↓
Display grade distribution charts
```

### Course Discovery Flow

```
Discovery script runs
    ↓
Fetch all courses year-by-year (2000-2025)
    ↓
Merge and deduplicate
    ↓
Export optimized JSON format
    ↓
Save to data/institutions/
    ↓
Copy to public/ during build
    ↓
Available for autocomplete
```

## 🛠️ Proxy Configuration

### Vercel Proxy (Recommended)

**Location**: `api/proxy.js`

**Configuration**: `vercel.json`

```json
{
  "functions": {
    "api/proxy.js": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/api/proxy",
      "destination": "/api/proxy.js"
    }
  ]
}
```

**Usage**: Automatically used when deployed to Vercel

### Public CORS Proxies (Fallback)

Used if Vercel proxy unavailable:

- `https://api.allorigins.win/raw?url=`
- `https://corsproxy.io/?`

**Note**: These are less reliable, use Vercel proxy when possible.

## 📊 Data Formats

### GradeData Interface

```typescript
interface GradeData {
  Institusjonskode: string;
  Emnekode: string;
  Karakter: string;  // A, B, C, D, E, F, Bestått, Ikke bestått
  Årstall: string;
  "Antall kandidater totalt": string;
  // Additional fields may exist
}
```

### DiscoveredCourse Interface

```typescript
interface DiscoveredCourse {
  courseCode: string;
  courseName?: string;
  years: number[];
  totalStudents: number;
  path: string[];
  pathNames: string[];
  studentCountByYear?: Record<number, number>;
}
```

### Optimized Course Format

```typescript
interface OptimizedCourse {
  c: string;  // courseCode
  n?: string; // courseName (optional)
  y: number[]; // years
  s?: number; // lastYearStudents (optional)
}
```

## ⚠️ API Limitations

### Rate Limiting

- ⚠️ No official rate limit documented
- ✅ Scripts include delays (500ms between requests)
- ✅ Batch processing prevents overwhelming API

### Data Availability

- ⚠️ Not all courses have grade data
- ⚠️ Data availability varies by year
- ⚠️ Some institutions have limited historical data

### Response Size

- ⚠️ Large requests may time out
- ✅ Scripts use `begrensning: "1000"` (limit 1000 results)
- ✅ Year-by-year fetching prevents large responses

## 🔍 API Testing

### Test API Connection

```bash
# Using curl
curl -X POST https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData \
  -H "Content-Type: application/json" \
  -d '{
    "tabell_id": 308,
    "api_versjon": 1,
    "filter": [
      {
        "variabel": "Institusjonskode",
        "selection": {"filter": "item", "values": ["1150"]}
      },
      {
        "variabel": "Emnekode",
        "selection": {"filter": "item", "values": ["TDT4110"]}
      }
    ]
  }'
```

### Test with Script

```bash
# Test hierarchy discovery
npm run test-hierarchy

# Test specific fetch
npm run test-fetch
```

## 🐛 API Troubleshooting

### CORS Errors

**Symptoms**: Network errors in browser console

**Solutions**:
- Verify proxy is configured correctly
- Check Vercel proxy is working (if deployed)
- Test direct API call (should work in Node.js)

### 204 No Content

**Symptoms**: Empty results for valid course

**Solutions**:
- Verify course code is correct
- Check year has data available
- Try different year
- Verify institution code

### Timeout Errors

**Symptoms**: Requests timeout after long wait

**Solutions**:
- Add year filter to reduce response size
- Use smaller time ranges
- Add delays between requests
- Check API status

### Invalid Filter Errors

**Symptoms**: 400 Bad Request errors

**Solutions**:
- Verify filter variable names are correct
- Check filter values are valid
- Review filter structure
- Test with simpler filters first

## 📝 API Best Practices

1. **Use Filters**: Always filter by institution and course code
2. **Batch Requests**: Fetch year-by-year for large datasets
3. **Add Delays**: Include delays between requests (500ms)
4. **Handle Errors**: Always catch and handle API errors
5. **Cache Results**: Cache course lists (static JSON)
6. **Validate Data**: Check response format before processing

## 🔗 External Resources

- NSD API Documentation: https://dbh.hkdir.no/
- NSD Statistics Portal: https://dbh.hkdir.no/tall-og-statistikk/
- Institution Codes: See NSD website for full list

## 🆘 Getting Help

For API issues:
1. Check NSD website is accessible
2. Verify filter values are correct
3. Test with simple filters first
4. Review error messages carefully
5. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

