# Hierarchy Architecture & Discovery System

## Overview

This system provides a **flexible, general-purpose API** that can handle all hierarchy types across Norwegian educational institutions. It supports automatic discovery of courses by drilling down through hierarchy levels.

## Key Principles

### 1. **Single Generic API Function**
- One flexible `fetchWithFilters()` function accepts any combination of filters
- Works with ALL hierarchy types automatically
- No need for institution-specific functions

### 2. **Hierarchy Configuration**
- Each institution maps to its preferred hierarchy type
- Configurations stored in `lib/hierarchy-config.ts`
- Easy to add new institutions or modify existing ones

### 3. **Automatic Discovery**
- Functions to automatically drill down through hierarchies
- Discovers all courses without manual configuration
- Can cache discovered structures locally

## Hierarchy Types Supported

The system supports all 11 hierarchy types from DBH:

1. `Institusjon-fakultet-institutt-studieprogram-emne` (UiO/NTNU)
2. `Studium-institusjon-studieprogram-emne` (NHH)
3. `Institusjonstype-institusjon-fakultet-institutt-studieprogram-emne`
4. `Institusjon-fakultet-emne-studieprogram`
5. `Institusjon-fakultet-studieprogram-emne`
6. `Institusjon-studium-studieprogram-emne`
7. `Fagfelt-institusjon-studieprogram-emne`
8. `Institusjon-fagfelt-studieprogram-emne`
9. `Institusjonstype-institusjon-studieprogram-emne`
10. `Hovednivå-undernivå-institusjon-fakultet-studieprogram`
11. `Institusjonstype-institusjon-emne` (Simplest)

## Architecture Components

### 1. Hierarchy Configuration (`lib/hierarchy-config.ts`)

Maps each institution to its hierarchy structure:

```typescript
export const HIERARCHY_CONFIGS: Record<string, HierarchyConfig> = {
  '1110': { // UiO
    hierarchyType: 'Institusjon-fakultet-institutt-studieprogram-emne',
    variableNames: {
      institution: 'Institusjonskode',
      faculty: 'Fakkode',
      department: 'Ufakkode',
      studyProgram: 'Progkode',
      course: 'Emnekode',
    },
    drillingPath: ['institution', 'faculty', 'department', 'course'],
  },
  '1240': { // NHH
    hierarchyType: 'Studium-institusjon-studieprogram-emne',
    variableNames: {
      institution: 'Institusjonskode',
      studium: 'Studkode',
      studyProgram: 'Progkode',
      course: 'Emnekode',
    },
    drillingPath: ['institution', 'studium', 'studyProgram', 'course'],
  },
};
```

### 2. Generic Fetch Function (`lib/hierarchy-discovery.ts`)

The core function that works with any hierarchy:

```typescript
async function fetchWithFilters(
  institutionCode: string,
  filters: Record<string, string[]>, // Any combination of filters
  year?: number
): Promise<GradeData[]>
```

**Example usage:**
```typescript
// Fetch all courses for NHH Bachelor program
const courses = await fetchWithFilters('1240', {
  'Progkode': ['BACHELOR15'],
  'Studkode': ['ØA']
});

// Fetch courses for UiO Mathematics department
const courses = await fetchWithFilters('1110', {
  'Fakkode': ['260'],
  'Ufakkode': ['210']
});
```

### 3. Discovery Functions

Automatically discover courses by drilling down:

```typescript
// Get ALL courses for an institution (simplest)
const allCourses = await getAllCoursesForInstitution('1240', 2024);

// Discover full hierarchy tree
const hierarchy = await discoverInstitutionHierarchy('1110', 2024);
```

## Usage Examples

### Example 1: Simple - Get All Courses

```typescript
import { getAllCoursesForInstitution } from '@/lib/hierarchy-discovery';

// Get all NHH courses for 2024
const nhhCourses = await getAllCoursesForInstitution('1240', 2024);
// Returns: Array of courses with codes, names, years, student counts
```

### Example 2: Filtered by Study Program

```typescript
import { discoverCoursesAtPath } from '@/lib/hierarchy-discovery';

// Get all courses in NHH Bachelor program
const bachelorCourses = await discoverCoursesAtPath('1240', {
  'Progkode': ['BACHELOR15'],
  'Studkode': ['ØA']
});
```

### Example 3: UiO Faculty/Department

```typescript
// Get all courses in UiO Mathematics department
const mathCourses = await discoverCoursesAtPath('1110', {
  'Fakkode': ['260'],
  'Ufakkode': ['210']
});
```

## Discovery Strategy

### How Automatic Discovery Works

1. **Start at Institution Level**
   ```typescript
   const allData = await fetchWithFilters('1240', {});
   ```

2. **Extract Available Levels**
   - The API response contains all hierarchy information
   - We extract unique codes at each level

3. **Drill Down Recursively**
   ```typescript
   // Level 1: Get all study programs
   const programs = extractLevelValues(data, 'Progkode');
   
   // Level 2: For each program, get courses
   for (const program of programs) {
     const courses = await fetchWithFilters('1240', {
       'Progkode': [program.code]
     });
   }
   ```

4. **Cache Discovered Structure**
   - Store hierarchy tree locally
   - Avoid re-discovery on subsequent requests

## Local Storage & Caching

### Recommended Approach

1. **Initial Discovery** (one-time per institution)
   ```typescript
   const hierarchy = await discoverInstitutionHierarchy('1240');
   // Save to: data/institutions/1240-hierarchy.json
   ```

2. **Course Cache** (per institution/year)
   ```typescript
   const courses = await getAllCoursesForInstitution('1240', 2024);
   // Save to: data/institutions/1240-courses-2024.json
   ```

3. **Runtime Usage**
   - Check cache first
   - Fall back to API if cache miss
   - Background refresh for stale data

## Benefits of This Approach

### ✅ **Flexibility**
- Works with ALL hierarchy types
- No code changes needed for new institutions

### ✅ **Automatic Discovery**
- No manual configuration required
- Automatically finds all courses

### ✅ **Maintainability**
- Single source of truth (hierarchy config)
- Easy to add new institutions

### ✅ **Performance**
- Can cache discovered structures
- Avoid redundant API calls

### ✅ **Scalability**
- Works for all 60+ Norwegian institutions
- Handles complex hierarchies automatically

## Adding a New Institution

1. **Add to Institution Registry** (`lib/institution-registry.ts`)
   ```typescript
   { code: 'XXXX', name: 'New Institution', shortName: 'NEW', type: 'university' }
   ```

2. **Add Hierarchy Config** (`lib/hierarchy-config.ts`)
   ```typescript
   'XXXX': {
     hierarchyType: 'Institusjon-fakultet-institutt-studieprogram-emne',
     variableNames: { ... },
     drillingPath: [...],
   }
   ```

3. **Done!** The system automatically handles the rest.

## Next Steps

1. **Implement Caching System**
   - Create `lib/cache-discovery.ts` for hierarchy caching
   - Store discovered structures in `data/` directory

2. **Build Discovery UI**
   - Component to browse hierarchies
   - Visual tree view of institution structure

3. **Batch Discovery Script**
   - Script to discover all institutions at once
   - Generate complete course database

4. **Update Existing Components**
   - Refactor `DepartmentBrowser` to use new system
   - Use generic functions instead of institution-specific ones

## Answer to Your Question

> "Should we aim to make a general API fetch or specific for each educational thing?"

**Answer: General API fetch with hierarchy configuration.**

- ✅ One generic `fetchWithFilters()` function
- ✅ Configuration maps institutions to their hierarchy type
- ✅ Automatic discovery handles all variations
- ✅ No need for institution-specific fetch functions

The API itself is flexible - it accepts any combination of filters. The hierarchy type just determines:
- Which filters we use
- How we organize the data
- The drilling-down path

**This gives us the best of both worlds:**
- General enough to handle all cases
- Specific enough to work optimally for each institution

