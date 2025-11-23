# GPA Calculator - Complete Documentation

Welcome to the comprehensive documentation for the Norwegian GPA Calculator project. This documentation covers everything you need to know to maintain, update, and extend the system.

## 📚 Documentation Index

### Getting Started
1. **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Initial setup and installation
2. **[QUICK_START.md](./QUICK_START.md)** - Quick start guide

### Recent Improvements
3. **[RECENT_IMPROVEMENTS.md](./RECENT_IMPROVEMENTS.md)** - ⭐ **Latest improvements (2025)** - Mobile optimization, logo, UI enhancements
4. **[MOBILE_OPTIMIZATION.md](./MOBILE_OPTIMIZATION.md)** - Comprehensive mobile optimization guide
5. **[LOGO_AND_BRANDING.md](./LOGO_AND_BRANDING.md)** - Logo implementation and branding guidelines

### Data Management
6. **[DATA_SOURCES.md](./DATA_SOURCES.md)** - ⭐ **Specific NSD website links used to discover data**
7. **[DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md)** - How to fetch and manage course data
8. **[DATA_STORAGE_STRATEGY.md](./DATA_STORAGE_STRATEGY.md)** - Data storage architecture and optimization

### Development & Deployment
9. **[BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md)** - Building and deploying the website
10. **[API_REFERENCE.md](./API_REFERENCE.md)** - API details and integration
11. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview
12. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions

## 🎯 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### First Time Setup
```bash
# Clone the repository
git clone <repository-url>
cd gpa

# Install dependencies
npm install

# Build the project
npm run build
```

### Fetching Course Data (First Time)
```bash
# Fetch all course data for all institutions (will take 30-60 minutes)
npm run discover-nhh-all   # NHH - ~5-10 minutes
npm run discover-ntnu      # NTNU - ~15-20 minutes
npm run discover-uio       # UiO - ~10-15 minutes
npm run discover-uib       # UiB - ~10-15 minutes

# Build with new data
npm run build
```

## 📊 Current Data Status

| Institution | Courses | File Size | Last Updated | Years Covered |
|-------------|---------|-----------|--------------|---------------|
| NHH | 657 | 27 KB | See data files | 2000-2025 |
| NTNU | 7,643 | 337 KB | See data files | 2000-2025 |
| UiO | 4,800 | 203 KB | See data files | 2000-2025 |
| UiB | 3,361 | 147 KB | See data files | 2000-2025 |
| **Total** | **16,461** | **714 KB** | - | **2000-2025** |

## 🔄 Regular Updates

### Update Course Data (Monthly/Quarterly)
1. Run discovery scripts (see [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md))
2. Review changes
3. Build and deploy

### Update Dependencies (Quarterly)
```bash
npm outdated
npm update
npm run build  # Test after updates
```

## 📁 Key Directories

```
gpa/
├── data/
│   └── institutions/          # Course JSON files (auto-generated)
├── scripts/
│   ├── discover-*.ts          # Discovery scripts
│   └── optimize-course-json.ts # Optimization tool
├── lib/
│   ├── api.ts                 # NSD API integration
│   ├── courses.ts             # Course data and search
│   └── hierarchy-discovery.ts # Generic hierarchy discovery
├── components/                # React components
├── pages/                     # Next.js pages
├── public/                    # Static assets (auto-copied from data/)
└── docs/                      # This documentation
```

## 🚀 Common Tasks

### Add a New Institution
See [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md#adding-a-new-institution)

### Update Course Data
See [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md#updating-course-data)

### Optimize Data Files
```bash
npm run optimize-courses
```

### Build for Production
```bash
npm run build
```

### Deploy
See [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md)

## 💡 Important Notes

1. **Data Format**: All course data is stored in optimized JSON format (98% smaller than original)
2. **Years**: Scripts fetch data from 2000-2025 (26 years)
3. **Build**: Course files are automatically copied to `public/` during build
4. **Static Export**: The site uses static export (`output: 'export'` in next.config.js)
5. **API**: Grade data is fetched dynamically from NSD API when users search

## 🆘 Need Help?

- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- Review [API_REFERENCE.md](./API_REFERENCE.md) for API details
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview

## 📝 License & Credits

This project uses data from the Norwegian Centre for Research Data (NSD) API.
See LICENSE file for details.
