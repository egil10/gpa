# Architecture Overview

## Project Structure

```
gpa/
├── components/          # React components
│   ├── CourseAutocomplete.tsx    # Course search with autocomplete
│   ├── CourseCard.tsx            # Course preview card
│   ├── Footer.tsx                # Site footer
│   ├── GPACalculator.tsx         # GPA calculator component
│   ├── GradeChart.tsx             # Grade distribution chart
│   ├── Layout.tsx                # Main layout wrapper
│   ├── Navbar.tsx                 # Navigation bar
│   └── StatCard.tsx               # Statistics card
│
├── docs/               # Documentation
│   ├── ARCHITECTURE.md
│   ├── DATA_RETRIEVAL.md
│   └── API.md
│
├── lib/                # Utility functions
│   ├── api.ts          # NSD API integration
│   ├── courses.ts      # Course database and search
│   └── utils.ts        # Data processing utilities
│
├── pages/              # Next.js pages
│   ├── _app.tsx        # App wrapper
│   ├── index.tsx       # Home page
│   ├── kalkulator.tsx  # GPA calculator page
│   ├── om.tsx          # About page
│   └── sok.tsx         # Search page
│
├── styles/             # CSS styles
│   ├── globals.css     # Global styles (Swiss academic design)
│   └── *.module.css    # Component-specific styles
│
├── types/              # TypeScript type definitions
│   ├── gpa.ts          # GPA calculator types
│   └── index.ts        # General types
│
└── public/             # Static assets
```

## Design System

### Swiss Academic Style

- **Typography**: Inter (sans-serif) + JetBrains Mono (monospace)
- **Color Palette**: Black, white, grays with blue accent
- **Spacing**: 8px base grid system
- **Animations**: GPU-accelerated with `will-change` hints

### Key Design Principles

1. **Minimalism**: Clean, uncluttered interfaces
2. **Typography-First**: Clear hierarchy and readability
3. **Performance**: Smooth 60fps animations
4. **Accessibility**: Semantic HTML and ARIA labels

## Data Flow

### Search Flow

```
User Input → CourseAutocomplete → Search Form
    ↓
handleSearch() → fetchGradeData() → NSD API
    ↓
processGradeData() → GradeChart → Display
```

### GPA Calculator Flow

```
User Input → Course State → calculateGPA()
    ↓
Real-time Updates → Display GPA
```

## Technology Stack

- **Framework**: Next.js 14 (Static Export)
- **Language**: TypeScript
- **Styling**: CSS Modules
- **Charts**: Recharts
- **Icons**: Lucide React
- **Data Fetching**: Native Fetch API

## State Management

- **Local State**: React hooks (useState, useCallback, useMemo)
- **URL State**: Next.js router for shareable links
- **No Global State**: No Redux/Context needed for current scope

## Performance Optimizations

1. **Code Splitting**: Automatic via Next.js
2. **Image Optimization**: Unoptimized for static export
3. **CSS**: Modular CSS with minimal global styles
4. **Animations**: GPU-accelerated transforms
5. **Memoization**: useMemo for expensive calculations

## Build Process

1. TypeScript compilation
2. Next.js build (static export)
3. Output to `out/` directory
4. Ready for GitHub Pages deployment

