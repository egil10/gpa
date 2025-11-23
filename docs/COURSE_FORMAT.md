# Course Addition Format

## Quick Format

To add courses quickly, use this simple format:

```
CODE:NAME:INSTITUTION
```

## Examples

```
IN3000:Avansert algoritmer:UiO
TDT4300:Data Science:NTNU
INF200:Databaser:UiB
DAT2000:Objektorientert programmering:OsloMet
BØK200:Strategi:BI
```

## Supported Institutions

- `UiO` - Universitetet i Oslo (code: 1110)
- `NTNU` - NTNU (code: 1150)
- `UiB` - Universitetet i Bergen (code: 1120)
- `OsloMet` - OsloMet (code: 1175)
- `BI` - Handelshøyskolen BI (code: 8241)

## Bulk Addition

Just paste your list of courses in the format above, and I'll convert them to the proper TypeScript format and add them to `lib/courses.ts`.

