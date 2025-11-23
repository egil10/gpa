# Quick Start Guide

## For Users

### Searching for Course Statistics

1. Go to the **Søk** (Search) page
2. Type a course code (e.g., "IN2010") or use autocomplete to find courses
3. Select institution and year
4. Click "Søk" to fetch grade distribution data
5. View interactive charts and statistics

### Using the GPA Calculator

1. Go to the **Kalkulator** page
2. Choose grade system (University A-F or High School 1-6)
3. Click "+ Legg til emne" to add courses
4. Enter course name, select grade, and set credits/points
5. Use ↑/↓ buttons to adjust grades and see GPA update in real-time

## For Developers

### Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploying to GitHub Pages

1. **First time setup**:
   - Go to GitHub repo → Settings → Pages
   - Set Source to "GitHub Actions"

2. **Deploy**:
   ```bash
   git push origin main
   ```
   That's it! The workflow automatically deploys from `main` branch.

3. **Check status**:
   - Go to Actions tab to see deployment progress
   - Site will be live at: `https://yourusername.github.io/gpa/`

### Build

```bash
# Build for production
npm run build

# Output will be in /out directory
```

### Project Structure

- `/components` - React components
- `/pages` - Next.js pages (routes)
- `/lib` - Utility functions and API integration
- `/styles` - CSS modules
- `/types` - TypeScript type definitions
- `/docs` - Documentation

### Key Files

- `lib/api.ts` - NSD API integration
- `lib/courses.ts` - Course database
- `pages/sok.tsx` - Search page
- `pages/kalkulator.tsx` - GPA calculator page

## Data Retrieval

Data is fetched **on-demand** from NSD API when users search. No caching is implemented - each search makes a fresh API request.

See [DATA_RETRIEVAL.md](DATA_RETRIEVAL.md) for more details.

