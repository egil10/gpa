# Running the Website Locally

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Open in Browser

Visit [http://localhost:3000](http://localhost:3000)

The development server will:
- Hot reload on file changes
- Show errors in the browser
- Provide fast refresh for React components

## Available Scripts

### Development

```bash
npm run dev
```
Starts Next.js development server on port 3000.

### Build for Production

```bash
npm run build
```
Creates optimized production build in `/out` directory.

### Test Production Build Locally

```bash
npm run build
npx serve out
```
Then visit the URL shown (usually `http://localhost:3000` or similar).

### Type Checking

```bash
npm run type-check
```
Runs TypeScript type checking without building.

## Troubleshooting

### Port Already in Use

If port 3000 is busy, Next.js will automatically use the next available port (3001, 3002, etc.).

### Module Not Found Errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## Development Tips

- **Hot Reload**: Changes to components/pages update automatically
- **Error Overlay**: Errors appear in the browser with helpful stack traces
- **Fast Refresh**: React components preserve state during updates
- **TypeScript**: Type errors show in terminal and browser

