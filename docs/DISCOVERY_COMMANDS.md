# Course Discovery Commands

All discovery scripts are exposed via npm aliases so you can fetch fresh course data for any institution with a single command. Every script:

1. Queries DBH year-by-year (2000 → current year)
2. Merges / deduplicates course codes (removing the API `-1` suffix)
3. Writes an optimized JSON file to `data/institutions/<institution>-all-courses.json`

After running **any** command below, remember to copy the generated JSON into the public folder so the frontend can serve it:

```bash
cp data/institutions/<file>.json public/data/institutions/
```

Then restart `npm run dev` (or rebuild/export) before deploying.

---

## Full Command List (alphabetical)

| Command | Institution |
| --- | --- |
| `npm run discover-aho` | Arkitektur- og designhøgskolen i Oslo |
| `npm run discover-ahs` | Ansgar høyskole |
| `npm run discover-bas` | Bergen Arkitekthøgskole |
| `npm run discover-bd` | Barratt Due Musikkinstitutt |
| `npm run discover-bi` | Handelshøyskolen BI |
| `npm run discover-dmmh` | Dronning Mauds Minne Høgskole |
| `npm run discover-fih` | Fjellhaug Internasjonale Høgskole |
| `npm run discover-hfdk` | Høyskolen for dansekunst | **NOT FOUND**
| `npm run discover-hgut` | Høgskulen for grøn utvikling |
| `npm run discover-him` | Høgskolen i Molde |
| `npm run discover-hio` | Høgskolen i Østfold |
| `npm run discover-hk` | Høyskolen Kristiania | **NOT FOUND**
| `npm run discover-hlt` | Høyskolen for ledelse og teologi | **NOT FOUND**
| `npm run discover-hvo` | Høgskulen i Volda |
| `npm run discover-hvl` | Høgskulen på Vestlandet |
| `npm run discover-inn` | Universitetet i Innlandet |
| `npm run discover-khio` | Kunsthøgskolen i Oslo |
| `npm run discover-ldh` | Lovisenberg diakonale høgskole | **ERROR**
| `npm run discover-mf` | MF vitenskapelig høyskole |
| `npm run discover-nhh-all` | Norges handelshøyskole (all courses) |
| `npm run discover-nih` | Norges idrettshøgskole |
| `npm run discover-nla` | NLA Høgskolen | **ERROR**
| `npm run discover-nmbu` | Norges miljø- og biovitenskapelige universitet |
| `npm run discover-nmh` | Norges musikkhøgskole |
| `npm run discover-nord` | Nord universitet |
| `npm run discover-ntnu` | Norges teknisk-naturvitenskapelige universitet |
| `npm run discover-oslomet` | OsloMet – storbyuniversitetet |
| `npm run discover-sh` | Samisk høgskole |
| `npm run discover-steiner` | Steinerhøyskolen | **ERROR**
| `npm run discover-uia` | Universitetet i Agder |
| `npm run discover-uib` | Universitetet i Bergen | **ERROR**
| `npm run discover-uio` | Universitetet i Oslo |
| `npm run discover-uis` | Universitetet i Stavanger |
| `npm run discover-uit` | Universitetet i Tromsø |
| `npm run discover-usn` | Universitetet i Sørøst-Norge |
| `npm run discover-vid` | VID vitenskapelige høgskole |
| `npm run discover-inn` | Universitetet i Innlandet |

> Tip: you can chain commands with `&&` to run several sequentially, e.g.  
> `npm run discover-uio && npm run discover-uib && npm run discover-ntnu`

---

## After Running the Scripts

1. Copy the generated JSON(s) into `public/data/institutions/`:
   ```bash
   cp data/institutions/uio-all-courses.json public/data/institutions/
   cp data/institutions/vid-all-courses.json public/data/institutions/
   # ...and so on
   ```
2. Restart `npm run dev` (or rebuild/export) so the frontend serves the new files.
3. Verify autocomplete/search on `/`, `/katalog`, and `/sok` find the updated courses.

That’s it—run whichever commands you need whenever DBH publishes new data.

