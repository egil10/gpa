# Logo and Branding Guide

## Logo

The Karakterstatistikk logo is a clean, minimalist representation of a bell curve (normal distribution), symbolizing the statistical nature of the platform and grade distributions.

### Design

- **Shape**: Bell curve with horizontal baseline
- **Style**: Minimalist, single-path design
- **Color**: Uses `currentColor` to adapt to theme
- **Format**: SVG for crisp rendering at all sizes

### Usage

#### Header Logo

The logo appears next to the "Karakterfordeling" title in the main header.

**Specifications:**
- Desktop: 4rem (64px) height
- Mobile: 3rem (48px) height
- Maintains aspect ratio automatically

**Location:** `pages/index.tsx` - Hero section

#### Favicon

The same logo is used as the favicon for browser tabs and bookmarks.

**Specifications:**
- 32x32px size
- SVG format for scalability
- Proper basePath handling for GitHub Pages deployment

**Location:** `public/favicon.svg`

### File Structure

```
public/
  ├── dist.svg          # Main logo file
  └── favicon.svg       # Favicon version

assets/
  ├── dist.svg          # Source file (optional backup)
  └── dist.png          # PNG version (optional)
```

### Implementation

#### In React Components

The logo is implemented using Next.js `Image` component for optimization:

```tsx
<Image 
  src="/dist.svg" 
  alt="Logo" 
  width={120} 
  height={68}
  priority
  style={{ width: 'auto', height: '4rem' }}
/>
```

#### CSS Styling

Logo styling is handled in `styles/Home.module.css`:

```css
.heroLogo {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-primary);
  height: 4rem;
  width: auto;
}
```

### Color Adaptation

The logo uses `currentColor` in the SVG, allowing it to automatically match:
- Text color in light mode
- Text color in dark mode (if implemented)
- Theme-aware coloring

### Updating the Logo

1. Replace `public/dist.svg` with new SVG file
2. Ensure SVG uses `currentColor` for strokes/fills
3. Update `public/favicon.svg` if favicon should match
4. Test at different sizes (header and favicon)
5. Verify responsive behavior on mobile devices

### Brand Guidelines

- **Keep it simple**: The logo should remain minimalist and clean
- **Maintain meaning**: Bell curve represents statistical distributions
- **Consistency**: Use the same logo across all touchpoints
- **Accessibility**: Ensure sufficient contrast and clear rendering

### Alternative Formats

While SVG is the primary format, PNG versions are available in `assets/` for:
- Social media sharing
- Print materials
- Fallback scenarios

