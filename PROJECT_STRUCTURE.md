# Project Structure

```
gpa/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment workflow
├── components/                  # React components
│   ├── CourseCard.tsx          # Course card component for home page
│   ├── Footer.tsx               # Footer component
│   ├── GradeChart.tsx           # Grade distribution chart
│   ├── Layout.tsx               # Main layout wrapper
│   ├── Navbar.tsx               # Navigation bar
│   └── StatCard.tsx             # Statistics card component
├── lib/                         # Utility functions
│   ├── api.ts                   # API integration (NSD)
│   └── utils.ts                 # Data processing utilities
├── pages/                       # Next.js pages
│   ├── _app.tsx                 # App wrapper
│   ├── index.tsx                # Home page
│   ├── om.tsx                   # About page
│   └── sok.tsx                  # Search page
├── public/                      # Static assets
├── styles/                      # CSS styles
│   ├── globals.css              # Global styles (Swiss academic design)
│   ├── Home.module.css          # Home page styles
│   ├── Search.module.css        # Search page styles
│   └── About.module.css         # About page styles
├── types/                       # TypeScript types
│   └── index.ts                 # Type definitions
├── .gitignore                   # Git ignore rules
├── .gitattributes               # Git attributes
├── next.config.js               # Next.js configuration
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript configuration
├── README.md                    # Project documentation
├── DEPLOYMENT.md                # Deployment guide
└── PROJECT_STRUCTURE.md         # This file
```

## Key Features

### Design System
- **Swiss Academic Style**: Clean, minimal, typography-focused design
- **Color Palette**: Black, white, grays with blue accent
- **Typography**: Inter (sans-serif) and JetBrains Mono (monospace)
- **Spacing**: 8px base grid system

### Pages
1. **Home (`/`)**: 
   - Hero section
   - Statistics overview
   - Featured courses
   - Exploration cards

2. **Search (`/sok`)**:
   - Course code search
   - Institution selection
   - Year selection
   - Grade distribution visualization
   - Additional statistics

3. **About (`/om`)**:
   - Project information
   - Data source information
   - Technology stack

### Components
- **GradeChart**: Interactive bar chart using Recharts
- **CourseCard**: Preview card for courses
- **StatCard**: Statistics display card
- **Layout**: Main layout with navbar and footer

### Data Integration
- Fetches data from NSD API
- Supports 5 Norwegian universities
- Processes grade distributions
- Calculates average grades


