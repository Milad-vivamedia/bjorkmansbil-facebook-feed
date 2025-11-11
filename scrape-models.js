/**
 * Web Scraper for Björkmans Bil - Vehicle Models
 * Fetches new car models from bjorkmansbil.se and generates Facebook feed
 * Runs on GitHub Actions every hour
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const WEBSITE_URL = 'https://www.bjorkmansbil.se/modeller/?nav=nyhetererbjudanden';
const OUTPUT_DIR = './output';
const OUTPUT_FILE = 'feed.xml';

/**
 * Fetch HTML from website using Playwright (handles JavaScript rendering)
 */
async function fetchHTML() {
  console.log('🌐 Launching headless browser...');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    console.log('📄 Loading page...');
    await page.goto(WEBSITE_URL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for models to load
    await page.waitForSelector('.cat-wrap', { timeout: 10000 });

    console.log('⏳ Waiting for content to render...');
    await page.waitForTimeout(2000); // Extra wait for dynamic content

    const html = await page.content();

    return html;
  } finally {
    await browser.close();
  }
}

/**
 * Parse HTML to extract categories and models
 */
function parseModels(html) {
  const models = [];
  const modelsByUrl = new Map(); // To track unique models and their categories

  // Extract all category sections
  const categoryRegex = /<div id="([^"]+)" class="cat-wrap">([\s\S]*?)<\/div><\/div>/g;
  let categoryMatch;

  while ((categoryMatch = categoryRegex.exec(html)) !== null) {
    const categoryId = categoryMatch[1];
    const categoryHtml = categoryMatch[2];

    // Extract category name
    const categoryNameMatch = categoryHtml.match(/<h2 class="h4">([^<]+)<\/h2>/);
    const categoryName = categoryNameMatch ? categoryNameMatch[1].trim() : categoryId;

    // Clean category name from HTML entities
    const cleanCategoryName = categoryName
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract all models in this category
    const modelRegex = /<div class="model">([\s\S]*?)<\/div>\s*<\/div>/g;
    let modelMatch;

    while ((modelMatch = modelRegex.exec(categoryHtml)) !== null) {
      const modelHtml = modelMatch[1];

      // Extract model URL
      const urlMatch = modelHtml.match(/<a href="([^"]+)"/);
      const url = urlMatch ? urlMatch[1] : null;

      if (!url) continue;

      // Extract model name
      const nameMatch = modelHtml.match(/<h3 class="h5">([^<]+)<\/h3>/);
      const name = nameMatch ? nameMatch[1].trim() : '';

      // Extract description
      const descMatch = modelHtml.match(/<p>([^<]+)<\/p>/);
      const description = descMatch ? descMatch[1].trim() : '';

      // Extract image URL
      const imgMatch = modelHtml.match(/<img src="([^"]+)" alt="([^"]+)"/);
      const imageUrl = imgMatch ? imgMatch[1] : '';
      const imageAlt = imgMatch ? imgMatch[2] : name;

      // Check if model already exists (by URL)
      if (modelsByUrl.has(url)) {
        // Add this category to existing model
        modelsByUrl.get(url).categories.push(cleanCategoryName);
      } else {
        // New model
        const model = {
          id: url.split('/').filter(p => p).pop(), // Use last part of URL as ID
          name: name,
          description: description,
          url: url,
          imageUrl: imageUrl,
          imageAlt: imageAlt,
          categories: [cleanCategoryName],
          brand: 'Kia' // Björkmans Bil sells Kia
        };
        modelsByUrl.set(url, model);
      }
    }
  }

  // Convert Map to array
  return Array.from(modelsByUrl.values());
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate XML feed in RSS 2.0 format for Facebook
 */
function generateXMLFeed(models) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
  xml += '  <channel>\n';
  xml += '    <title>Björkmans Bil - Nya Kia Modeller</title>\n';
  xml += '    <link>https://www.bjorkmansbil.se</link>\n';
  xml += '    <description>Björkmans Bil - Kia Vehicle Models</description>\n';

  let processedCount = 0;

  models.forEach(model => {
    // Skip if missing essential data
    if (!model.id || !model.name || !model.url) {
      return;
    }

    xml += '    <item>\n';

    // Required Facebook fields
    xml += '    <g:google_product_category>916</g:google_product_category>\n'; // Vehicles
    xml += '    <g:fb_product_category>173</g:fb_product_category>\n'; // Vehicles
    xml += `    <g:id>${escapeXml(model.id)}</g:id>\n`;

    // Title
    xml += `    <title>${escapeXml(model.name)}</title>\n`;

    // Description (include categories)
    const categoryText = model.categories.join(', ');
    const fullDescription = model.description
      ? `${model.description} Kategorier: ${categoryText}.`
      : `${model.name}. Kategorier: ${categoryText}.`;
    xml += `    <description>${escapeXml(fullDescription)}</description>\n`;

    // URL / Link
    xml += `    <link>${escapeXml(model.url)}</link>\n`;
    xml += `    <g:url>${escapeXml(model.url)}</g:url>\n`;

    // Brand
    xml += `    <g:brand>${escapeXml(model.brand)}</g:brand>\n`;

    // Image
    if (model.imageUrl) {
      xml += `    <g:image_link>${escapeXml(model.imageUrl)}</g:image_link>\n`;
    }

    // Availability & Condition
    xml += '    <g:availability>in stock</g:availability>\n';
    xml += '    <g:condition>new</g:condition>\n';

    // Add categories as custom labels for Facebook filtering
    model.categories.forEach((category, index) => {
      if (index < 5) { // Facebook supports up to 5 custom labels
        xml += `    <g:custom_label_${index}>${escapeXml(category)}</g:custom_label_${index}>\n`;
      }
    });

    // Product type (category hierarchy)
    const productType = `Fordon > Nya Bilar > ${model.brand} > ${model.categories[0]}`;
    xml += `    <g:product_type>${escapeXml(productType)}</g:product_type>\n`;

    xml += '    </item>\n';
    processedCount++;
  });

  xml += '  </channel>\n';
  xml += '</rss>';

  console.log(`✅ Generated feed with ${processedCount} models`);
  console.log(`📊 Total unique models: ${models.length}`);

  // Log category distribution
  const categoryCounts = {};
  models.forEach(model => {
    model.categories.forEach(cat => {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
  });
  console.log(`📁 Category distribution:`, categoryCounts);

  return xml;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting Björkmans Bil model scraper...');
    console.log(`📡 Fetching from: ${WEBSITE_URL}`);

    // Fetch HTML
    const html = await fetchHTML();
    console.log(`✅ HTML fetched successfully (${html.length} characters)`);

    // Parse models
    const models = parseModels(html);
    console.log(`✅ Parsed ${models.length} unique models`);

    if (models.length === 0) {
      throw new Error('No models found! Check if website structure has changed.');
    }

    // Generate XML
    const xml = generateXMLFeed(models);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Write XML to file
    const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);
    fs.writeFileSync(outputPath, xml, 'utf8');

    console.log(`💾 Saved feed to: ${outputPath}`);
    console.log(`📊 File size: ${(xml.length / 1024).toFixed(2)} KB`);

    // Create index.html
    const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Björkmans Bil - Nya Kia Modeller Feed</title>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #333; }
    .info { background: #f0f0f0; padding: 20px; border-radius: 5px; }
    .feed-url { background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; word-break: break-all; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>🚗 Björkmans Bil - Kia Modeller Feed</h1>

  <div class="info">
    <h2>Feed URL</h2>
    <div class="feed-url">
      <strong>Use this URL in Facebook Commerce Manager:</strong><br><br>
      <code id="feedUrl">Loading...</code>
    </div>

    <h2>Status</h2>
    <p>✅ Feed is active and updating automatically every hour</p>
    <p>Last updated: <strong>${new Date().toLocaleString('sv-SE')}</strong></p>
    <p>Total models: <strong>${models.length}</strong></p>

    <h2>Models by Category</h2>
    <table>
      <thead>
        <tr>
          <th>Model</th>
          <th>Categories</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${models.map(m => `
        <tr>
          <td><strong>${escapeXml(m.name)}</strong></td>
          <td>${escapeXml(m.categories.join(', '))}</td>
          <td>${escapeXml(m.description)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>Quick Links</h2>
    <ul>
      <li><a href="feed.xml">View XML Feed</a></li>
      <li><a href="https://business.facebook.com/commerce/" target="_blank">Facebook Commerce Manager</a></li>
      <li><a href="https://www.bjorkmansbil.se" target="_blank">Björkmans Bil Website</a></li>
    </ul>
  </div>

  <script>
    const feedUrl = window.location.origin + window.location.pathname + 'feed.xml';
    document.getElementById('feedUrl').textContent = feedUrl;
  </script>
</body>
</html>`;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml, 'utf8');
    console.log('📄 Created index.html');
    console.log('✅ Feed generation complete!');

  } catch (error) {
    console.error('❌ Error generating feed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the main function
main();
