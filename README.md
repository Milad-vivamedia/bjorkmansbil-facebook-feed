# 🚗 Björkmans Bil - Facebook Dynamic Ads Feed (Nya Kia Modeller)

Automatically scrape Kia vehicle models from bjorkmansbil.se and generate Facebook Dynamic Ads feed.

---

## ✨ Features

- ✅ **Web scraping** - Fetches models directly from bjorkmansbil.se
- ✅ **Multi-category support** - Models can be in multiple categories
- ✅ **Auto-updates** every hour via GitHub Actions
- ✅ **100% free** hosting on GitHub Pages
- ✅ **No API needed** - Scrapes HTML directly
- ✅ **Facebook compliant** XML/RSS format

---

## 📊 What It Does

Scrapes this page: `https://www.bjorkmansbil.se/modeller/?nav=nyhetererbjudanden`

Extracts:
- **Kia EV3** (categories: "Nyheter & erbjudanden", "Elbilar")
- **Kia EV4** (categories: "Nyheter & erbjudanden", "Elbilar")
- **Kia Sportage** (categories: "SUV", "Hybridbilar")
- etc.

Each model includes:
- Model name
- Description
- Image
- URL to model page
- Categories (as custom labels for Facebook filtering)

---

## 🚀 Setup

### 1. Create GitHub Repository

```bash
Repository name: bjorkmansbil-facebook-feed
Public: Yes
```

### 2. Upload Files

Upload all files from this folder:
- `.github/workflows/update-feed.yml`
- `scrape-models.js`
- `package.json`
- `.gitignore`

### 3. Enable GitHub Actions

- Go to Actions tab
- Enable workflows
- Run "Update Björkmans Bil Model Feed" manually

### 4. Enable GitHub Pages

- Settings → Pages
- Branch: `gh-pages` / root
- Save

### 5. Get Your Feed URL

```
https://YOUR_USERNAME.github.io/bjorkmansbil-facebook-feed/feed.xml
```

---

## 📋 Feed Structure

```xml
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <item>
      <g:id>kia-ev3</g:id>
      <title>Kia EV3</title>
      <description>Kampanj! Kategorier: Nyheter & erbjudanden, Elbilar.</description>
      <link>https://www.bjorkmansbil.se/modeller/kia-ev3/</link>
      <g:brand>Kia</g:brand>
      <g:image_link>https://www.bjorkmansbil.se/wp-content/uploads/2024/09/nya-kia-ev3-modell.png</g:image_link>
      <g:availability>in stock</g:availability>
      <g:condition>new</g:condition>
      <g:custom_label_0>Nyheter & erbjudanden</g:custom_label_0>
      <g:custom_label_1>Elbilar</g:custom_label_1>
      <g:product_type>Fordon > Nya Bilar > Kia > Nyheter & erbjudanden</g:product_type>
    </item>
  </channel>
</rss>
```

---

## 🎯 Facebook Product Sets

Create targeted ad campaigns based on categories:

**Elbilar (Electric Vehicles)**
- Filter: `custom_label_0` = "Elbilar" OR `custom_label_1` = "Elbilar"
- Target: Eco-conscious buyers

**Nyheter & erbjudanden (News & Offers)**
- Filter: `custom_label_0` = "Nyheter & erbjudanden"
- Target: Deal seekers

**SUV**
- Filter: `custom_label_0` = "SUV"
- Target: Family-oriented buyers

**Hybridbilar (Hybrids)**
- Filter: Category contains "Hybrid"
- Target: Practical buyers

---

## 🔄 How It Works

```
Every hour:
  GitHub Actions runs
    ↓
  Scrapes bjorkmansbil.se
    ↓
  Extracts models & categories
    ↓
  Generates XML feed
    ↓
  Deploys to GitHub Pages
    ↓
  Facebook reads updated feed
```

---

## 💰 Cost

**$0 Forever**

- GitHub Actions: Free (2,000 min/month)
- GitHub Pages: Free (100GB bandwidth)
- No API costs (web scraping)

---

## 📁 Files

| File | Purpose |
|------|---------|
| `scrape-models.js` | Web scraper & feed generator |
| `.github/workflows/update-feed.yml` | Auto-update workflow |
| `package.json` | Node.js configuration |
| `.gitignore` | Git settings |

---

## 🛠️ Local Testing

```bash
# Install dependencies
npm install

# Run scraper
npm run generate

# Check output
cat output/feed.xml
```

---

## 🔍 Troubleshooting

### No models found?
- Website structure may have changed
- Check HTML structure in `scrape-models.js`

### Feed not updating?
- Check GitHub Actions logs
- Verify workflow has proper permissions

### Facebook rejecting feed?
- Validate XML at https://validator.w3.org/feed/
- Check Facebook diagnostics tab

---

## 📊 Monitoring

**Feed URL**: `https://YOUR_USERNAME.github.io/bjorkmansbil-facebook-feed/feed.xml`

**Status Page**: `https://YOUR_USERNAME.github.io/bjorkmansbil-facebook-feed/`

Shows:
- Total models
- Models by category
- Last update time
- Quick links

---

## 🎨 Customization

### Change update frequency

Edit `.github/workflows/update-feed.yml`:

```yaml
schedule:
  - cron: '0 * * * *'    # Every hour
  # - cron: '0 */6 * * *'  # Every 6 hours
  # - cron: '0 0 * * *'    # Daily at midnight
```

### Add more data

Edit `scrape-models.js` to extract:
- Prices (if available)
- Specifications
- More images
- Videos

---

## 📝 Notes

- **No API dependency** - Works as long as website HTML structure stays similar
- **Resilient** - If scraping fails, old feed remains available
- **Duplicate handling** - Same model in multiple categories = one item with multiple custom labels
- **SEO friendly** - Models linked directly to bjorkmansbil.se

---

## 🎯 Next Steps

1. ✅ Create repository
2. ⬜ Upload files
3. ⬜ Enable Actions & Pages
4. ⬜ Add feed to Facebook
5. ⬜ Create product sets by category
6. ⬜ Launch ad campaigns

---

**Made for Björkmans Bil** 🚗💨
