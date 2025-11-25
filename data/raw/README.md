# Raw Data Files

This directory contains raw source data files used for processing.

## VGS Grade Statistics

Excel/CSV files exported from UDIR's Statistikkportalen for VGS (videregående skole) grade statistics.

These files are:
- **Temporary**: Used as input for `scripts/parse-vgs-grade-statistics.ts`
- **Ignored by git**: Already in `.gitignore` (`.xlsx`, `.csv` files)
- **Auto-detected**: The parse script automatically finds the most recent file in this directory or repo root

## Usage

When you download a new VGS grade statistics file from UDIR:
1. Place it in this directory (`data/raw/`)
2. Run: `npm run parse-vgs-grades`
3. The script will automatically use the most recent file

## File Naming

Files should match the pattern: `*Karakterer_i_videregaaende_skole*` (case-insensitive)

Example:
- `20251125-1728_Karakterer_i_videregaaende_skole.xlsx`
- `Karakterer_i_videregaaende_skole_2024-25.csv`

