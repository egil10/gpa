# Karakterstatistikk

En moderne plattform for å utforske karakterfordelinger ved norske universiteter. Bygget med Next.js og inspirert av sveitsisk akademisk design.

## 🚀 Funksjoner

- 🔍 **Søk etter karakterstatistikk** - Finn karakterfordelinger for spesifikke emner med autocomplete
- 📊 **Visualisering** - Interaktive grafer for karakterfordelinger
- 🏛️ **5 universiteter** - Støtte for UiO, NTNU, OsloMet, UiB, og BI
- 🧮 **GPA Kalkulator** - Beregn GPA med ECTS-poeng (universitet og videregående)
- 📱 **Responsivt design** - Fungerer på alle enheter
- ⚡ **Høy ytelse** - GPU-akselererte animasjoner for smooth opplevelse

## 🛠️ Teknologi

- **Next.js 14** - React-rammeverk med statisk eksport
- **TypeScript** - Typesikkerhet
- **Recharts** - Datavisualisering
- **Lucide React** - Ikoner
- **CSS Modules** - Modulær styling

## 📦 Installasjon

```bash
npm install
```

## 🏃 Kjøre Lokalt

```bash
npm install
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren.

## 🚀 Deployment

**GitHub Actions deployer automatisk fra `main` branch!**

1. Push til `main`:
   ```bash
   git push origin main
   ```

2. Aktiver GitHub Pages:
   - Settings → Pages → Source: "GitHub Actions"

3. Vent på deployment (2-3 minutter)

4. Din side er live! 🎉

Se [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detaljer.

## 🏗️ Bygging

```bash
npm run build
```

Genererer en `out`-mappe klar for deployment.

## 📚 Dokumentasjon

Se [docs/](docs/) mappen for detaljert dokumentasjon:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Prosjektstruktur og arkitektur
- [DATA_RETRIEVAL.md](docs/DATA_RETRIEVAL.md) - Hvordan datahenting fungerer
- [API.md](docs/API.md) - API dokumentasjon
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment guide

## 📊 Data

Data hentes **on-demand** fra [NSD (Norsk senter for forskningsdata)](https://nsd.no) via deres API når brukere søker. Ingen caching - hver søk gjør en direkte API-kall.

## 📄 Lisens

ISC
