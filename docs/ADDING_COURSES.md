# Adding Courses to the Database

## Current Status

- **Total courses**: 44 courses 
- **Location**: `lib/courses.ts` in the `POPULAR_COURSES` array
- **Breakdown by institution**:
  - UiO: 17 courses
  - NTNU: 10 courses
  - UiB: 4 courses
  - OsloMet: 2 courses
  - BI: 4 courses

## Course Data Structure

Each course needs 4 pieces of information:

```typescript
{
  code: string;           // Course code (e.g., 'IN2010')
  name: string;          // Full course name (e.g., 'Algoritmer og datastrukturer')
  institution: string;    // Institution key (e.g., 'UiO', 'NTNU', 'UiB', 'OsloMet', 'BI')
  institutionCode: string; // NSD institution code (e.g., '1110' for UiO)
}
```

## Institution Codes

| Institution | Key | Code |
|------------|-----|------|
| Universitetet i Oslo | UiO | 1110 |
| NTNU | NTNU | 1150 |
| Universitetet i Bergen | UiB | 1120 |
| OsloMet | OsloMet | 1175 |
| Handelshøyskolen BI | BI | 8241 |

## How to Add Courses

### Option 1: Direct Edit (Small additions)

Edit `lib/courses.ts` and add courses to the `POPULAR_COURSES` array:

```typescript
export const POPULAR_COURSES: CourseInfo[] = [
  // ... existing courses ...
  
  // New courses
  { code: 'NEWCODE', name: 'Course Name', institution: 'UiO', institutionCode: '1110' },
];
```

### Option 2: Bulk Add (Recommended for many courses)

You can provide a simple list in this format:

```
CODE:NAME:INSTITUTION
```

Example:
```
IN3000:Avansert algoritmer:UiO
TDT4300:Data Science:NTNU
INF200:Databaser:UiB
```

Then I can convert it to the proper format automatically.

### Option 3: CSV Format

You can also provide a CSV file:

```csv
code,name,institution
IN3000,Avansert algoritmer,UiO
TDT4300,Data Science,NTNU
INF200,Databaser,UiB
```

## Notes

- Course codes are case-insensitive (stored uppercase)
- Course names should be in Norwegian
- Institution must match one of the supported institutions
- Duplicate course codes for the same institution will overwrite previous entries

## Where Courses Are Used

1. **Autocomplete**: Course search in search page and GPA calculator
2. **Course Explorer**: Browse all available courses
3. **Home Dashboard**: Random course showcase
4. **Institution Locking**: Auto-locks institution when course is selected

