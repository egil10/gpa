# API Documentation

## NSD API Integration

### Endpoint

```
POST https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData
```

### Function: `fetchGradeData`

Fetches grade distribution data from NSD API.

**Parameters:**
- `institutionCode: string` - Institution code (e.g., "1110" for UiO)
- `courseCode: string` - Formatted course code (e.g., "IN2010-1")
- `year: number` - Year to fetch data for

**Returns:** `Promise<GradeData[]>`

**Example:**
```typescript
const data = await fetchGradeData('1110', 'IN2010-1', 2022);
```

### Function: `formatCourseCode`

Formats course code according to institution rules.

**Parameters:**
- `courseCode: string` - Raw course code
- `institution: string` - Institution key (e.g., "UiO", "BI")

**Returns:** `string`

**Rules:**
- BI: Adds "1" suffix (e.g., "BØK110" → "BØK1101")
- Others: Adds "-1" suffix (e.g., "IN2010" → "IN2010-1")

## Course Database

### Function: `searchCourses`

Searches the local course database.

**Parameters:**
- `query: string` - Search query (course code or name)
- `institutionFilter?: string` - Optional institution filter

**Returns:** `CourseInfo[]`

**Example:**
```typescript
const results = searchCourses('IN2010', 'UiO');
```

### Function: `getCourseByCode`

Gets course information by code.

**Parameters:**
- `code: string` - Course code
- `institution?: string` - Optional institution filter

**Returns:** `CourseInfo | null`

## GPA Calculator

### Function: `calculateGPA`

Calculates GPA from course list.

**Parameters:**
- `courses: Course[]` - Array of courses with grades and credits

**Returns:** `GPACalculation`

**Formula:**
```
GPA = (Σ(grade_value × credits)) / (Σ(credits))
```

**Grade Values:**
- University: A=5, B=4, C=3, D=2, E=1, F=0
- High School: 6=6, 5=5, 4=4, 3=3, 2=2, 1=1

## Supported Universities

| Key | Code | Name |
|-----|------|------|
| UiO | 1110 | Universitetet i Oslo |
| NTNU | 1150 | Norges teknisk-naturvitenskapelige universitet |
| OsloMet | 1175 | OsloMet – storbyuniversitetet |
| UiB | 1120 | Universitetet i Bergen |
| BI | 8241 | Handelshøyskolen BI |

## Error Handling

### API Errors

- **204 No Content**: No data found for query
- **Network Error**: Connection failed
- **Invalid Response**: Malformed data

All errors are caught and displayed to the user with helpful messages.

