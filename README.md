# Karakterstatistikk

En moderne plattform for å utforske karakterfordelinger ved norske universiteter. Bygget med Next.js og inspirert av sveitsisk akademisk design.

## Funksjoner

- 🔍 Søk etter karakterstatistikk for spesifikke emner
- 📊 Visualisering av karakterfordelinger
- 🏛️ Støtte for 5 norske universiteter (UiO, NTNU, OsloMet, UiB, BI)
- 🧮 GPA Kalkulator med ECTS-poeng
  - Støtter universitetskarakterer (A-F) og videregående (1-6)
  - Legg til emnenavn og juster karakterer for å se GPA-endringer
  - Real-time beregning med smooth animasjoner
- 📱 Responsivt design
- 🎨 Sveitsisk akademisk designstil
- ⚡ Høy ytelse med GPU-akselererte animasjoner

## Teknologi

- **Next.js 14** - React-rammeverk med statisk eksport for GitHub Pages
- **TypeScript** - Typesikkerhet
- **Recharts** - Datavisualisering
- **CSS Modules** - Modulær styling

## Installasjon

```bash
npm install
```

## Utvikling

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren.

## Bygging for produksjon

```bash
npm run build
```

Dette genererer en `out`-mappe som kan deployes til GitHub Pages.

## GitHub Pages Deployment

1. Bygg prosjektet: `npm run build`
2. Push `out`-mappen til `gh-pages` branch, eller
3. Konfigurer GitHub Actions til å automatisk bygge og deploye (inkludert i prosjektet)

## Data

Data hentes fra [NSD (Norsk senter for forskningsdata)](https://nsd.no) via deres API.

## Lisens

ISC
