/**
 * Enhanced Web Scraper for Björkmans Bil - with Financing Details
 * Fetches models AND financing options from each model page
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
 * Fetch model overview from main page
 */
async function fetchModelOverview(page) {
  console.log('📄 Loading model overview page...');
  await page.goto(WEBSITE_URL, {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForSelector('.cat-wrap', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Close cookie banner if present
  try {
    const acceptButton = await page.locator('button:has-text("Acceptera alla")').first();
    if (await acceptButton.isVisible({ timeout: 2000 })) {
      await acceptButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Closed cookie banner');
    }
  } catch (e) {
    // Cookie banner not found or already closed
  }

  // Extract all model URLs
  const modelUrls = await page.evaluate(() => {
    const urls = [];
    const modelLinks = document.querySelectorAll('.model a[href*="/modeller/"]');
    modelLinks.forEach(link => {
      const url = link.getAttribute('href');
      if (url && !urls.includes(url)) {
        urls.push(url);
      }
    });
    return urls;
  });

  console.log(`✅ Found ${modelUrls.length} unique model URLs`);
  return modelUrls;
}

/**
 * Scrape financing details from a single model page
 */
async function scrapeModelFinancing(page, modelUrl) {
  console.log(`\n🔍 Scraping: ${modelUrl}`);

  try {
    await page.goto(modelUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Close cookie banner if present
    try {
      const acceptButton = await page.locator('button:has-text("Acceptera alla")').first();
      if (await acceptButton.isVisible({ timeout: 2000 })) {
        await acceptButton.click();
        await page.waitForTimeout(500);
        console.log('   ✅ Closed cookie banner');
      }
    } catch (e) {
      // Cookie banner not found or already closed
    }

    // Extract basic model info and image
    const modelInfo = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const modelName = h1 ? h1.textContent.trim() : '';

      // Try to find the main model image from .img-container (the variant product image)
      let imageUrl = '';

      // Strategy 1: Get the image from .img-container (this is the car variant image we want)
      const imgContainerImg = document.querySelector('.img-container img');
      if (imgContainerImg) {
        const src = imgContainerImg.src || imgContainerImg.getAttribute('data-src') || '';
        if (src && src.includes('wp-content/uploads') && !src.includes('elbil.png')) {
          imageUrl = src;
        }
      }

      // Strategy 2: Fallback to og:image if .img-container not found
      if (!imageUrl) {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
          const ogImageUrl = ogImage.getAttribute('content');
          if (ogImageUrl && ogImageUrl.includes('wp-content/uploads')) {
            imageUrl = ogImageUrl;
          }
        }
      }

      return { modelName, imageUrl };
    });

    console.log(`   📝 Model: ${modelInfo.modelName}`);
    if (modelInfo.imageUrl) {
      console.log(`   🖼️  Image: ${modelInfo.imageUrl.substring(0, 60)}...`);
    }

    // Get financing URLs from button data-location attributes
    const financingUrls = await page.evaluate(() => {
      const urls = [];
      const btnElements = document.querySelectorAll('button.financing-menu-button');
      btnElements.forEach(btn => {
        const text = btn.textContent.trim();
        const url = btn.getAttribute('data-location');
        if (url) {
          urls.push({ type: text, url });
        }
      });
      return urls;
    });

    console.log(`   💰 Found ${financingUrls.length} financing types`);

    const allFinancingOptions = [];

    // Visit each financing URL directly
    for (const financing of financingUrls) {
      console.log(`      ➜ ${financing.type}: ${financing.url}`);

      try {
        // Navigate to financing page
        await page.goto(financing.url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        await page.waitForTimeout(1500);

        // Extract financing options for this tab
        const options = await page.evaluate((financingType) => {
          const results = [];

          // Look for radio button labels (model packages)
          const radioLabels = document.querySelectorAll('input[type="radio"] + label, label:has(input[type="radio"])');

          radioLabels.forEach(label => {
            const text = label.textContent.trim();

            // Match patterns like:
            // "Plus FWD Long Range 3 412 kr/mån"
            // "GT Line FWD Long Range 3 747 kr/mån"
            const match = text.match(/^(.+?)\s+(\d[\s\d]+)\s*kr\/mån/);

            if (match) {
              const packageName = match[1].trim();
              const priceStr = match[2].replace(/\s/g, '');
              const price = parseInt(priceStr, 10);

              // Filter out:
              // - Tillval (starts with +, or contains "Dragkrok", "Vinterhjul", etc.)
              // - Pricing notes ("Privatleasing 12-36")
              // - Invalid prices (too small)
              const isTillval = packageName.startsWith('+') ||
                               packageName.toLowerCase().includes('dragkrok') ||
                               packageName.toLowerCase().includes('vinterhjul') ||
                               packageName.toLowerCase().includes('led-ramp');

              const isPricingNote = packageName.toLowerCase().includes('privatleasing') ||
                                   packageName.toLowerCase().includes('mil/år');

              if (!isNaN(price) && price > 1000 && !isTillval && !isPricingNote) {
                results.push({
                  financingType: financingType,
                  packageName: packageName,
                  monthlyPrice: price
                });
              }
            }
          });

          return results;
        }, financing.type);

        allFinancingOptions.push(...options);

        console.log(`         Found ${options.length} package options`);
        if (options.length > 0) {
          options.forEach(opt => {
            console.log(`            - ${opt.packageName}: ${opt.monthlyPrice} kr/mån`);
          });
        }

      } catch (error) {
        console.error(`         ❌ Error clicking button: ${error.message}`);
      }
    }

    // Deduplicate financing options
    // Keep only one entry per unique combination of (packageName, financingType)
    // Prefer the lowest price if there are duplicates
    const dedupedOptions = new Map();

    allFinancingOptions.forEach(option => {
      const key = `${option.packageName}|${option.financingType}`;

      if (!dedupedOptions.has(key)) {
        dedupedOptions.set(key, option);
      } else {
        // Keep the one with lower price
        const existing = dedupedOptions.get(key);
        if (option.monthlyPrice < existing.monthlyPrice) {
          dedupedOptions.set(key, option);
        }
      }
    });

    const uniqueOptions = Array.from(dedupedOptions.values());

    console.log(`   ✅ After deduplication: ${uniqueOptions.length} unique options`);

    return {
      modelName: modelInfo.modelName,
      modelUrl,
      imageUrl: modelInfo.imageUrl,
      financingOptions: uniqueOptions
    };

  } catch (error) {
    console.error(`   ❌ Error scraping ${modelUrl}:`, error.message);
    return null;
  }
}

/**
 * Main scraping function
 */
async function scrapeAllModels() {
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

    // Step 1: Get all model URLs
    const modelUrls = await fetchModelOverview(page);

    // Step 2: Scrape each model's financing details
    const allModels = [];

    for (const url of modelUrls) { // Scrape all models
      const modelData = await scrapeModelFinancing(page, url);
      if (modelData) {
        allModels.push(modelData);
      }
    }

    return allModels;

  } finally {
    await browser.close();
  }
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
 * Generate XML feed with financing options
 */
function generateXMLFeed(models) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
  xml += '  <channel>\n';
  xml += '    <title>Björkmans Bil - Nya Kia Modeller med Finansiering</title>\n';
  xml += '    <link>https://www.bjorkmansbil.se</link>\n';
  xml += '    <description>Björkmans Bil - Kia Models with Financing Options</description>\n';

  let processedCount = 0;

  models.forEach(model => {
    // Create separate items for each financing option
    model.financingOptions.forEach((option, index) => {
      const itemId = `${model.modelName}-${option.packageName}-${option.financingType}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      xml += '    <item>\n';

      // Facebook required fields
      xml += '    <g:google_product_category>916</g:google_product_category>\n';
      xml += '    <g:fb_product_category>173</g:fb_product_category>\n';
      xml += `    <g:id>${escapeXml(itemId)}</g:id>\n`;

      // Title
      const title = `${model.modelName} ${option.packageName} - ${option.financingType}`;
      xml += `    <title>${escapeXml(title)}</title>\n`;

      // Description
      const description = `${model.modelName} ${option.packageName}. ${option.financingType} från ${option.monthlyPrice.toLocaleString('sv-SE')} kr/mån.`;
      xml += `    <description>${escapeXml(description)}</description>\n`;

      // URL
      xml += `    <link>${escapeXml(model.modelUrl)}</link>\n`;

      // Brand
      xml += '    <g:brand>Kia</g:brand>\n';

      // Image
      if (model.imageUrl) {
        xml += `    <g:image_link>${escapeXml(model.imageUrl)}</g:image_link>\n`;
      }

      // Price (monthly cost)
      xml += `    <g:price>${option.monthlyPrice} SEK</g:price>\n`;

      // Custom labels for filtering
      xml += `    <g:custom_label_0>${escapeXml(option.financingType)}</g:custom_label_0>\n`;
      xml += `    <g:custom_label_1>${escapeXml(option.packageName)}</g:custom_label_1>\n`;
      xml += `    <g:custom_label_2>Månadskostnad: ${option.monthlyPrice} kr</g:custom_label_2>\n`;

      // Availability & Condition
      xml += '    <g:availability>in stock</g:availability>\n';
      xml += '    <g:condition>new</g:condition>\n';

      xml += '    </item>\n';
      processedCount++;
    });
  });

  xml += '  </channel>\n';
  xml += '</rss>';

  console.log(`\n✅ Generated feed with ${processedCount} financing options`);
  return xml;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting Björkmans Bil financing scraper...');
    console.log(`📡 Fetching from: ${WEBSITE_URL}\n`);

    // Scrape all models with financing
    const models = await scrapeAllModels();

    console.log(`\n✅ Scraped ${models.length} models`);

    // Count total financing options
    const totalOptions = models.reduce((sum, m) => sum + m.financingOptions.length, 0);
    console.log(`💰 Total financing options: ${totalOptions}`);

    if (totalOptions === 0) {
      throw new Error('No financing options found! Check if website structure has changed.');
    }

    // Generate XML
    const xml = generateXMLFeed(models);

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Write XML to file
    const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);
    fs.writeFileSync(outputPath, xml, 'utf8');

    console.log(`💾 Saved feed to: ${outputPath}`);
    console.log(`📊 File size: ${(xml.length / 1024).toFixed(2)} KB`);
    console.log('✅ Feed generation complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main();
