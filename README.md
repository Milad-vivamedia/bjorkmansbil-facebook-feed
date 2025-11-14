# Björkmans Bil - Facebook Dynamic Ads Feed

Automatisk feed-generator för Björkmans Bil's Kia-modeller till Facebook Dynamic Ads.

## Funktioner

- ✅ Hämtar automatiskt alla Kia-modeller från bjorkmansbil.se
- ✅ Inkluderar alla finansieringsalternativ:
  - Kia Billån inkl. serviceavtal
  - Kia Privatleasing
  - Kia Företagsleasing
- ✅ Uppdateras automatiskt varje timme via GitHub Actions
- ✅ 100% gratis lösning med GitHub Pages
- ✅ Facebook-kompatibel RSS 2.0 XML-format

## Feed URL

```
https://milad-vivamedia.github.io/bjorkmansbil-facebook-feed/feed.xml
```

## Innehåll

Feeden innehåller:
- 15 Kia-modeller
- 105+ unika finansieringsalternativ
- Automatisk deduplikering
- Kategorisering per finansieringstyp
- Månadspriser för alla paket

## Teknisk info

- **Scraper**: Playwright (headless browser)
- **Uppdatering**: Varje timme via GitHub Actions
- **Hosting**: GitHub Pages
- **Format**: RSS 2.0 med Google Base namespace

## Användning i Facebook

1. Gå till Facebook Commerce Manager
2. Skapa ny produktkatalog eller använd befintlig
3. Lägg till datafeed med URL:en ovan
4. Välj automatisk uppdatering (varje timme)

## Lokal utveckling

```bash
npm install
node generate-feed.js
```

Feeden genereras i `output/feed.xml`.
