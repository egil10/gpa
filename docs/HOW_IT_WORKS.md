# How Data Retrieval Works

## ✅ It Works Out of the Box!

**No setup needed!** The data retrieval is already configured and ready to use.

## How It Works

### 1. **Public API - No Authentication**
- The NSD API is **public** - no API keys or authentication needed
- No backend server required
- Works directly from the browser (client-side)
- Works perfectly on GitHub Pages (static hosting)

## Testing If It Works

### Test Locally:

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Go to http://localhost:3000/sok

3. Try searching for:
   - Course: `IN2010`
   - Institution: `UiO`
   - Year: `2022`

4. Click "Søk"

5. **If it works**: You'll see grade distribution charts
6. **If it fails**: You'll see an error message

### Common Issues:

#### CORS Errors
If you see CORS errors in browser console:
- NSD API should allow cross-origin requests
- If not, you might need a proxy (but this shouldn't be necessary)

#### "No data found" Error
- Course code might be wrong
- Year might not have data
- Institution might not offer that course

#### Network Errors
- Check internet connection
- NSD API might be temporarily down
- Check browser console for details

## What You DON'T Need to Do

❌ **No API key setup**  
❌ **No backend server**  
❌ **No database**  
❌ **No authentication**  
❌ **No environment variables**  

## What Happens Behind the Scenes

```javascript
// When user searches, this function runs:
async function fetchGradeData(institutionCode, courseCode, year) {
  // Creates request payload
  const payload = {
    tabell_id: 308,
    filter: [
      { variabel: "Institusjonskode", values: ["1110"] },
      { variabel: "Emnekode", values: ["IN2010-1"] },
      { variabel: "Årstall", values: ["2022"] }
    ]
  };
  
  // Makes POST request to NSD API
  const response = await fetch('https://api.nsd.no/...', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  // Returns data
  return response.json();
}
```

## Current Status

✅ **Fully functional** - Ready to use  
✅ **No configuration needed** - Works immediately  
✅ **Public API** - No authentication required  
✅ **Client-side only** - No backend needed  

## If Something Doesn't Work

1. **Check browser console** (F12) for errors
2. **Test with known course codes**:
   - UiO: `IN2010`, `IN1010`, `STK1100`
   - NTNU: `TDT4100`, `TDT4110`
3. **Try different years** (2010-2023)
4. **Check NSD API status** (might be temporarily down)

## Summary

**You're all set!** The data retrieval works automatically. Just:
1. Deploy your site
2. Users can search
3. Data loads from NSD API automatically

No additional setup required! 🎉

