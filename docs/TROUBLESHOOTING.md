# Troubleshooting Guide

Common issues and their solutions for the GPA Calculator project.

## 🔧 Build Issues

### Issue: Build Fails with TypeScript Errors

**Symptoms**:
```
Failed to compile
Type error: ...
```

**Solutions**:
1. Run type check separately:
   ```bash
   npm run type-check
   ```
2. Check specific error messages
3. Verify Node.js version (18+):
   ```bash
   node --version
   ```
4. Clear and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Issue: `fs` Module Warning

**Symptoms**:
```
Module not found: Can't resolve 'fs' in 'lib/cache.ts'
```

**Status**: ✅ **This is harmless!**

**Explanation**: 
- `cache.ts` only runs server-side
- Warning appears during static build
- Code is never executed in browser

**Action**: Ignore this warning, it doesn't affect functionality.

### Issue: Build Fails - Missing Course Data

**Symptoms**:
```
Error: Cannot find module '../data/institutions/...'
```

**Solutions**:
1. Verify data files exist:
   ```bash
   ls data/institutions/*.json
   ```
2. Run discovery scripts:
   ```bash
   npm run discover-nhh-all
   npm run discover-ntnu
   npm run discover-uio
   npm run discover-uib
   ```
3. Check `scripts/copy-nhh-data.js` runs without errors

### Issue: Build Succeeds but Files Missing

**Symptoms**: Build completes but course JSON files not in `out/`

**Solutions**:
1. Check prebuild script runs:
   ```bash
   node scripts/copy-nhh-data.js
   ```
2. Verify files exist in `public/`:
   ```bash
   ls public/*.json
   ```
3. Check `next.config.js` basePath matches deployment path

## 📊 Data Issues

### Issue: Discovery Script Fails

**Symptoms**: Script stops or errors mid-run

**Solutions**:
1. **Check Network**:
   - Verify internet connection
   - Test NSD API: https://dbh.hkdir.no/
   
2. **Check API Access**:
   ```bash
   curl https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData
   ```

3. **Verify Institution Code**:
   - UiO: 1110
   - UiB: 1120
   - NTNU: 1150
   - NHH: 1240

4. **Check Year Range**:
   - Scripts fetch 2000-2025
   - Some institutions may not have data for all years
   - Scripts continue on errors (designed to be resilient)

5. **Re-run Script**:
   - Scripts merge with existing data
   - Safe to re-run multiple times
   - Existing data won't be lost

### Issue: Wrong Course Counts

**Symptoms**: Fewer/more courses than expected

**Solutions**:
1. **Verify Institution Code**: Wrong code = wrong data
2. **Check Year Filter**: Older years may have fewer courses
3. **Review Script Output**: Check for errors or warnings
4. **Compare with NSD Website**: Manually check course counts

### Issue: Duplicate Courses

**Symptoms**: Same course appears multiple times

**Solutions**:
- Scripts automatically deduplicate by course code
- Check for variations (e.g., "TDT4110" vs "TDT4110-1")
- Review merge logic if issues persist

### Issue: Missing Course Names

**Symptoms**: Courses have codes but no names

**Solutions**:
- Some courses in API don't have names
- This is normal - names are optional
- Course codes are sufficient for search

### Issue: JSON Files Corrupted

**Symptoms**: Cannot parse JSON files

**Solutions**:
1. **Validate JSON**:
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('data/institutions/nhh-all-courses.json'))"
   ```

2. **Restore from Backup**:
   ```bash
   cp data/institutions/*.backup data/institutions/*.json
   ```

3. **Re-run Discovery**:
   ```bash
   npm run discover-nhh-all
   ```

## 🌐 API Issues

### Issue: CORS Errors in Browser

**Symptoms**:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solutions**:
1. **Verify Proxy Configuration**:
   - Check `api/proxy.js` exists
   - Verify `vercel.json` configuration
   - Test proxy endpoint if deployed

2. **Check Proxy Fallbacks**:
   - Scripts use multiple proxy fallbacks
   - If all fail, check network connectivity

3. **Test Direct API** (Node.js only):
   ```bash
   npm run test-fetch
   ```

### Issue: API Returns 204 No Content

**Symptoms**: No data returned for valid course

**Solutions**:
1. **Verify Course Code**: Check spelling and format
2. **Try Different Year**: Course may not have data for that year
3. **Check NSD Website**: Verify course exists and has grade data
4. **Institution Code**: Ensure correct institution code

### Issue: API Timeout

**Symptoms**: Requests hang or timeout

**Solutions**:
1. **Add Year Filter**: Reduces response size
2. **Check API Status**: NSD API may be slow/down
3. **Add Delays**: Scripts include 500ms delays
4. **Reduce Scope**: Fetch smaller year ranges

### Issue: Invalid Filter Error (400)

**Symptoms**: `400 Bad Request` errors

**Solutions**:
1. **Verify Variable Names**: 
   - `Institusjonskode` (not `InstitutionCode`)
   - `Emnekode` (not `CourseCode`)
   - Check exact spelling and capitalization

2. **Check Filter Values**:
   - Institution codes: 1110, 1120, 1150, 1240
   - Course codes: Format varies by institution
   - Year: String format "2024" not number 2024

3. **Simplify Filters**: Test with just institution code first

## 🚀 Deployment Issues

### Issue: Site Deploys but Features Don't Work

**Symptoms**: Site loads but search/calculations fail

**Solutions**:
1. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for JavaScript errors
   - Check Network tab for 404s

2. **Verify Course Files**:
   - Check files exist in `out/` after build
   - Verify JSON files are accessible
   - Check file paths match basePath

3. **Check basePath**:
   - Verify `next.config.js` basePath matches deployment URL
   - GitHub Pages: `/gpa`
   - Custom domain: `/` or custom path

### Issue: 404 on Course JSON Files

**Symptoms**: Autocomplete doesn't work, console shows 404s

**Solutions**:
1. **Check File Paths**:
   ```bash
   # Files should be in out/ after build
   ls out/*.json
   ```

2. **Verify basePath**:
   ```javascript
   // next.config.js
   basePath: '/gpa'  // Should match deployment path
   ```

3. **Check Copy Script**:
   ```bash
   node scripts/copy-nhh-data.js
   # Should copy files to public/
   ```

4. **Verify Deployment**:
   - Files should be uploaded to hosting provider
   - Check file permissions
   - Verify file extensions (.json not blocked)

### Issue: Charts Don't Display

**Symptoms**: Grade distribution charts are blank

**Solutions**:
1. **Check API Proxy**:
   - Verify proxy is configured
   - Test proxy endpoint
   - Check CORS headers

2. **Check Network Tab**:
   - Open DevTools → Network
   - Look for failed API requests
   - Check response status codes

3. **Verify Course Code**:
   - Course must have grade data
   - Try different course
   - Check NSD website for course

4. **Check Browser Console**:
   - Look for JavaScript errors
   - Check Recharts rendering errors

## 💻 Development Issues

### Issue: Development Server Won't Start

**Symptoms**: `npm run dev` fails or hangs

**Solutions**:
1. **Check Port 3000**:
   ```bash
   # Linux/Mac
   lsof -i :3000
   kill -9 [PID]
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID [PID] /F
   ```

2. **Clear Next.js Cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Reinstall Dependencies**:
   ```bash
   rm -rf node_modules
   npm install
   ```

### Issue: Hot Reload Not Working

**Symptoms**: Changes don't reflect in browser

**Solutions**:
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Restart dev server
3. Clear browser cache
4. Check file watchers aren't limited (too many files)

### Issue: TypeScript Errors in IDE

**Symptoms**: Red squiggles everywhere, but build works

**Solutions**:
1. **Restart TypeScript Server** (VS Code):
   - `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

2. **Verify tsconfig.json**:
   - Check paths are correct
   - Verify includes/excludes

3. **Reinstall Dependencies**:
   ```bash
   npm install
   ```

## 📦 Package Issues

### Issue: npm install Fails

**Symptoms**: Errors during dependency installation

**Solutions**:
1. **Clear npm Cache**:
   ```bash
   npm cache clean --force
   ```

2. **Delete and Reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Use Legacy Peer Deps**:
   ```bash
   npm install --legacy-peer-deps
   ```

4. **Update npm**:
   ```bash
   npm install -g npm@latest
   ```

### Issue: Outdated Dependencies

**Symptoms**: Security warnings or outdated packages

**Solutions**:
1. **Check Outdated**:
   ```bash
   npm outdated
   ```

2. **Update Dependencies**:
   ```bash
   npm update
   ```

3. **Test After Update**:
   ```bash
   npm run build
   npm run type-check
   ```

## 🔍 Debugging Tips

### Enable Verbose Logging

```bash
# Development
DEBUG=* npm run dev

# Build
DEBUG=* npm run build
```

### Check File Sizes

```bash
# Check course data sizes
ls -lh data/institutions/*.json

# Check build output sizes
ls -lh out/
```

### Verify Data Structure

```bash
# Validate JSON
node -e "console.log(JSON.parse(require('fs').readFileSync('data/institutions/nhh-all-courses.json')))"

# Check course count
node -e "const d=JSON.parse(require('fs').readFileSync('data/institutions/nhh-all-courses.json')); console.log(d.courses.length)"
```

### Test API Directly

```bash
# Test NSD API
curl -X POST https://dbh.hkdir.no/api/Tabeller/hentJSONTabellData \
  -H "Content-Type: application/json" \
  -d '{"tabell_id":308,"api_versjon":1,"filter":[{"variabel":"Institusjonskode","selection":{"filter":"item","values":["1150"]}}]}'
```

## 📝 Getting Help

### Before Asking for Help

1. ✅ Check this troubleshooting guide
2. ✅ Check browser console for errors
3. ✅ Review error messages carefully
4. ✅ Try solutions listed above
5. ✅ Test with minimal example

### Information to Provide

When reporting issues, include:
- Error messages (full text)
- Steps to reproduce
- Node.js version: `node --version`
- npm version: `npm --version`
- Operating system
- Browser (if relevant)
- Console errors (if any)

### Resources

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Initial setup
- [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md) - Data workflows
- [API_REFERENCE.md](./API_REFERENCE.md) - API details
- [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) - Deployment

## ✅ Quick Checks

Run these checks if something isn't working:

```bash
# 1. Verify Node.js version
node --version  # Should be 18+

# 2. Check dependencies
npm list --depth=0

# 3. Type check
npm run type-check

# 4. Verify data files
ls data/institutions/*.json

# 5. Test build
npm run build

# 6. Check public files
ls public/*.json
```

If all pass but issue persists, check specific troubleshooting section above.

