# Data Retrieval

## How It Works

Data is retrieved **on-demand** from the NSD (Norsk senter for forskningsdata) API when users search for course statistics.

### Real-Time Fetching

- **When**: Data is fetched immediately when:
  - User clicks the "Søk" (Search) button
  - User navigates to a URL with query parameters (e.g., `/sok?code=IN2010&year=2022&uni=UiO`)
  
- **How**: Each search makes a direct API call to NSD's endpoint:
  ```
  POST https://api.nsd.no/dbhapitjener/Tabeller/hentJSONTabellData
  ```

- **No Caching**: Currently, there is no caching mechanism. Each search makes a fresh API request.

### API Request Flow

1. User enters course code, selects institution and year
2. Form submission triggers `handleSearch()` function
3. `fetchGradeData()` creates a POST request to NSD API
4. API returns grade distribution data
5. Data is processed and displayed in charts

### Request Payload

The API expects a JSON payload with:
- `tabell_id`: 308 (grade statistics table)
- `filter`: Institution code, course code, and year
- `groupBy`: Groups results by institution, course, grade, and year

Example payload:
```json
{
  "tabell_id": 308,
  "api_versjon": 1,
  "filter": [
    {
      "variabel": "Institusjonskode",
      "selection": { "filter": "item", "values": ["1110"] }
    },
    {
      "variabel": "Emnekode",
      "selection": { "filter": "item", "values": ["IN2010-1"] }
    },
    {
      "variabel": "Årstall",
      "selection": { "filter": "item", "values": ["2022"] }
    }
  ]
}
```

### Response Format

The API returns an array of grade distribution objects:
```json
[
  {
    "Institusjonskode": "1110",
    "Emnekode": "IN2010-1",
    "Karakter": "A",
    "Årstall": "2022",
    "Antall kandidater totalt": "18",
    "Antall kandidater kvinner": "4",
    "Antall kandidater menn": "14"
  },
  ...
]
```

## Future Improvements

Potential enhancements for data retrieval:

1. **Client-Side Caching**: Cache results in localStorage/sessionStorage to reduce API calls
2. **Service Worker**: Implement offline caching for frequently accessed courses
3. **Background Prefetching**: Prefetch data for popular courses
4. **Rate Limiting**: Implement request throttling to respect API limits
5. **Error Retry**: Add automatic retry logic for failed requests

## API Limitations

- No authentication required (public API)
- Rate limits: Unknown (use responsibly)
- Data availability: Depends on NSD's data updates
- Historical data: Available from 2010 onwards

## Data Source

All data comes from [NSD (Norsk senter for forskningsdata)](https://nsd.no), which is the official source for Norwegian higher education statistics.

