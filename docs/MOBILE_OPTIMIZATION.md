# Mobile Optimization Guide

This document details the mobile optimization strategies and implementations for the Karakterstatistikk website.

## Overview

The website has been fully optimized for mobile devices while maintaining full desktop functionality. All improvements follow mobile-first design principles and best practices.

## Viewport Configuration

### Meta Tags

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
<meta name="theme-color" content="#ffffff" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

**Key features:**
- `viewport-fit=cover`: Supports iOS notches and safe areas
- `maximum-scale=5`: Prevents over-zooming
- Theme color for browser UI matching

## Safe Area Support

### iOS Notch and System UI

The website properly handles iOS safe areas using CSS environment variables:

```css
padding-top: calc(var(--space-4xl) + env(safe-area-inset-top));
padding-bottom: calc(8rem + env(safe-area-inset-bottom));
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

**Areas handled:**
- Top safe area (notch)
- Bottom safe area (home indicator)
- Left/right safe areas (landscape mode)

## Responsive Breakpoints

### Breakpoint Strategy

- **Desktop**: Default styles (no breakpoint)
- **Tablet**: `@media (max-width: 768px)`
- **Mobile**: `@media (max-width: 480px)`

### Layout Adaptations

#### Grid Layouts

**Desktop:**
```css
grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
```

**Mobile:**
```css
grid-template-columns: 1fr; /* Single column */
```

#### Typography

**Desktop:**
```css
font-size: 3rem; /* Hero title */
```

**Mobile:**
```css
font-size: 2rem; /* Hero title */
```

## Touch Interactions

### Minimum Touch Targets

All interactive elements meet the 44x44px minimum touch target size:

```css
.min-height: 44px; /* Inputs, buttons */
.width: 44px; /* Icon buttons */
height: 44px; /* Icon buttons */
```

### Input Fields

**Mobile-specific considerations:**
- Minimum `font-size: 16px` to prevent iOS auto-zoom
- Adequate padding for comfortable tapping
- Clear focus states
- Proper keyboard types (`enterKeyHint="search"`)

## Component-Specific Optimizations

### Bottom Search Bar

```css
padding-bottom: calc(var(--space-lg) + env(safe-area-inset-bottom));
```

- Positioned above safe area on iOS
- Larger touch targets
- Smooth scrolling with `-webkit-overflow-scrolling: touch`

### Navigation

- Larger tap areas
- Clear visual feedback
- Stacked layout on mobile

### Course Cards

- Full-width on mobile
- Reduced padding
- Optimized chart sizes
- Touch-friendly interactions

### Forms and Filters

- Stacked form elements
- Larger dropdowns
- Clear labels
- Mobile-friendly search input

## Performance Optimizations

### Image Loading

- `priority` flag for above-the-fold images
- Responsive image sizes
- Lazy loading for below-the-fold content

### Font Sizing

- Relative units (rem, em)
- Responsive typography scale
- Prevents text reflow issues

### Scrolling

```css
-webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
```

## Mobile-Specific Features

### Home Button

- Floating action button
- Respects safe areas
- Touch-optimized size

### Search Functionality

- Persistent bottom search bar
- Keyboard-optimized input
- Quick search suggestions

### Loading States

- Mobile-friendly loading indicators
- Progress feedback
- Smooth animations

## Testing

### Devices Tested

- iPhone (various sizes including notch models)
- Android phones
- iPad/tablets
- Various screen orientations

### Key Test Areas

1. **Layout**: No horizontal scrolling
2. **Touch Targets**: All buttons easily tappable
3. **Safe Areas**: Content not hidden by system UI
4. **Typography**: Readable at all sizes
5. **Performance**: Smooth scrolling and interactions
6. **Forms**: Easy to fill out on mobile
7. **Navigation**: Intuitive mobile navigation

## Best Practices Applied

### Mobile-First CSS

Styles are written mobile-first, then enhanced for larger screens:

```css
/* Mobile styles (default) */
.component {
  padding: 1rem;
}

/* Desktop enhancements */
@media (min-width: 768px) {
  .component {
    padding: 2rem;
  }
}
```

### Flexible Layouts

- Flexbox and Grid with auto-fit
- Relative units (rem, %, vw, vh)
- No fixed pixel widths for containers

### Accessibility

- Proper ARIA labels
- Keyboard navigation
- Screen reader support
- Sufficient color contrast

## Future Enhancements

Potential mobile improvements:

1. **PWA Features**
   - Installable web app
   - Offline support
   - Push notifications

2. **Gesture Support**
   - Swipe navigation
   - Pull to refresh
   - Pinch to zoom (charts)

3. **Advanced Mobile Features**
   - Share API integration
   - Camera integration for QR codes
   - Biometric authentication

## Resources

- [MDN Mobile Web Development](https://developer.mozilla.org/en-US/docs/Web/Guide/Mobile)
- [Web.dev Mobile Best Practices](https://web.dev/mobile/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Material Design Guidelines](https://material.io/design)

