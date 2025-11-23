# Setup Guide

Complete step-by-step guide to set up the development environment and get the project running.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation:
     ```bash
     node --version  # Should show v18.x.x or higher
     npm --version   # Should show 9.x.x or higher
     ```

2. **Git**
   - Download from: https://git-scm.com/
   - Verify installation:
     ```bash
     git --version
     ```

3. **Code Editor** (optional but recommended)
   - Visual Studio Code: https://code.visualstudio.com/
   - Or any editor that supports TypeScript

### Optional but Recommended

- **GitHub CLI** (for easier GitHub operations)
- **TypeScript** (usually comes with Node.js projects)

## 🚀 Initial Setup

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd gpa

# Verify you're in the correct directory
ls -la  # or 'dir' on Windows
```

### Step 2: Install Dependencies

```bash
# Install all project dependencies
npm install

# This will install:
# - Next.js 14.x (React framework)
# - React 18.x
# - TypeScript 5.x
# - Recharts (for charts)
# - SWR (for data fetching)
# - Lucide React (for icons)
# - tsx (for running TypeScript scripts)
```

**Expected output:**
- Package files downloaded
- `node_modules/` folder created
- `package-lock.json` created/updated

### Step 3: Verify Installation

```bash
# Check if all dependencies are installed correctly
npm list --depth=0

# Should show all packages without errors
```

### Step 4: Verify Project Structure

Ensure you have the following key directories:

```
gpa/
├── data/
│   └── institutions/    # Will contain course JSON files
├── scripts/             # Discovery and utility scripts
├── lib/                 # Core library files
├── components/          # React components
├── pages/               # Next.js pages
├── public/              # Static assets
├── docs/                # Documentation
├── package.json         # Project configuration
└── tsconfig.json        # TypeScript configuration
```

## 🧪 Test the Setup

### Step 1: Type Check

```bash
# Verify TypeScript compiles without errors
npm run type-check

# Should complete without errors
```

### Step 2: Development Server

```bash
# Start the development server
npm run dev

# Should show:
# > gpa@1.0.0 dev
# > next dev
#
#   ▲ Next.js 14.x.x
#   - Local:        http://localhost:3000
#   - Ready in Xs
```

Open http://localhost:3000 in your browser to see the site running.

**Press `Ctrl+C` to stop the development server.**

### Step 3: Build Test

```bash
# Test production build
npm run build

# Should complete successfully with:
# ✓ Compiled successfully
# ✓ Generating static pages
# ✓ Finalizing page optimization
```

## 📊 Setup Course Data (First Time)

### Step 1: Create Data Directory

The directory should already exist, but verify:

```bash
# Ensure data directory exists
mkdir -p data/institutions  # Linux/Mac
# or
mkdir data\institutions     # Windows PowerShell
```

### Step 2: Fetch Initial Course Data

**⚠️ Important**: This will take 30-60 minutes total. Each script fetches 26 years of data (2000-2025).

```bash
# Fetch NHH courses (5-10 minutes)
npm run discover-nhh-all

# Fetch NTNU courses (15-20 minutes)
npm run discover-ntnu

# Fetch UiO courses (10-15 minutes)
npm run discover-uio

# Fetch UiB courses (10-15 minutes)
npm run discover-uib
```

**Expected output for each script:**
```
╔════════════════════════════════════════════════════════════╗
║     [Institution] Courses Discovery & Export                 ║
╚════════════════════════════════════════════════════════════╝

📡 Fetching all courses from [Institution]...
   Processing 26 years in batches...

[1/26] 📅 Fetching year 2025...
   ✅ Found X courses in Yms
   📊 Total unique courses so far: X

[... continues for each year ...]

✅ Exported X courses to:
   data/institutions/[institution]-all-courses.json
```

### Step 3: Verify Data Files

```bash
# List all generated files
ls -lh data/institutions/*.json  # Linux/Mac
# or
Get-ChildItem data\institutions\*.json  # Windows PowerShell

# Should show files like:
# - nhh-all-courses.json (27 KB)
# - ntnu-all-courses.json (337 KB)
# - uio-all-courses.json (203 KB)
# - uib-all-courses.json (147 KB)
```

### Step 4: Build with Data

```bash
# Build the project (automatically copies course files to public/)
npm run build

# Should complete successfully
```

## 🔧 Configuration

### Environment Variables (if needed)

Currently, no environment variables are required. If you need to configure anything:

1. Create `.env.local` file in project root
2. Add variables as needed:
   ```
   NEXT_PUBLIC_API_URL=https://dbh.hkdir.no/api
   ```

### Next.js Configuration

The project uses static export. Configuration is in `next.config.js`:

```javascript
{
  output: 'export',          // Static site generation
  basePath: '/gpa',          // GitHub Pages subdirectory
  images: { unoptimized: true },  // Required for static export
}
```

**Do not change these settings** unless you know what you're doing.

### TypeScript Configuration

TypeScript config is in `tsconfig.json`. Generally, no changes needed.

## ✅ Setup Complete Checklist

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Development server runs (`npm run dev`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Course data fetched (all 4 institutions)
- [ ] Data files exist in `data/institutions/`
- [ ] Build includes course files in `public/`

## 🐛 Troubleshooting

### Issue: `npm install` fails

**Solution:**
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules/` and `package-lock.json`
- Run `npm install` again
- If still failing, try `npm install --legacy-peer-deps`

### Issue: TypeScript errors

**Solution:**
- Run `npm run type-check` to see specific errors
- Ensure Node.js version is 18+
- Delete `node_modules/` and reinstall

### Issue: Discovery scripts fail

**Solution:**
- Check internet connection
- Verify NSD API is accessible: https://dbh.hkdir.no/
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for API-specific issues

### Issue: Build fails

**Solution:**
- Check that data files exist in `data/institutions/`
- Verify `scripts/copy-nhh-data.js` runs without errors
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for build-specific issues

## 📚 Next Steps

After setup is complete:

1. Read [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md) to understand data workflows
2. Review [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) for deployment
3. Check [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system

## 💡 Tips

1. **Keep dependencies updated**: Run `npm outdated` periodically
2. **Use version control**: Commit changes frequently
3. **Test before deploying**: Always run `npm run build` before deploying
4. **Backup data**: Keep backups of `data/institutions/` files

## 🆘 Getting Help

If you encounter issues:

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review error messages carefully
3. Check Node.js and npm versions
4. Verify all prerequisites are installed

