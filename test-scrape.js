const fs = require('fs');

// Read HTML from bjor.md
const html = fs.readFileSync('../bjor.md', 'utf8');

// Parse models (same function as in scrape-models.js)
function parseModels(html) {
  const models = [];
  const modelsByUrl = new Map();

  const categoryRegex = /<div id="([^"]+)" class="cat-wrap">([\s\S]*?)<\/div><\/div>/g;
  let categoryMatch;

  while ((categoryMatch = categoryRegex.exec(html)) !== null) {
    const categoryId = categoryMatch[1];
    const categoryHtml = categoryMatch[2];

    const categoryNameMatch = categoryHtml.match(/<h2 class="h4">([^<]+)<\/h2>/);
    const categoryName = categoryNameMatch ? categoryNameMatch[1].trim() : categoryId;

    const cleanCategoryName = categoryName
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const modelRegex = /<div class="model">([\s\S]*?)<\/div>\s*<\/div>/g;
    let modelMatch;

    while ((modelMatch = modelRegex.exec(categoryHtml)) !== null) {
      const modelHtml = modelMatch[1];

      const urlMatch = modelHtml.match(/<a href="([^"]+)"/);
      const url = urlMatch ? urlMatch[1] : null;

      if (!url) continue;

      const nameMatch = modelHtml.match(/<h3 class="h5">([^<]+)<\/h3>/);
      const name = nameMatch ? nameMatch[1].trim() : '';

      const descMatch = modelHtml.match(/<p>([^<]+)<\/p>/);
      const description = descMatch ? descMatch[1].trim() : '';

      const imgMatch = modelHtml.match(/<img src="([^"]+)" alt="([^"]+)"/);
      const imageUrl = imgMatch ? imgMatch[1] : '';

      if (modelsByUrl.has(url)) {
        modelsByUrl.get(url).categories.push(cleanCategoryName);
      } else {
        const model = {
          id: url.split('/').filter(p => p).pop(),
          name: name,
          description: description,
          url: url,
          imageUrl: imageUrl,
          categories: [cleanCategoryName],
          brand: 'Kia'
        };
        modelsByUrl.set(url, model);
      }
    }
  }

  return Array.from(modelsByUrl.values());
}

const models = parseModels(html);

console.log('✅ Test Results:');
console.log('Total unique models: ' + models.length);
console.log('');

// Show category distribution
const categoryCounts = {};
models.forEach(model => {
  model.categories.forEach(cat => {
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
});
console.log('📁 Models per category:');
Object.entries(categoryCounts).forEach(([cat, count]) => {
  console.log('   ' + cat + ': ' + count + ' models');
});
console.log('');

// Show first 3 models
console.log('🚗 Sample models:');
models.slice(0, 3).forEach((m, i) => {
  console.log('');
  console.log((i + 1) + '. ' + m.name);
  console.log('   URL: ' + m.url);
  console.log('   Description: ' + m.description);
  console.log('   Categories: ' + m.categories.join(', '));
  console.log('   Image: ' + m.imageUrl.substring(0, 60) + '...');
});

// Show models in multiple categories
console.log('');
console.log('📋 Models in multiple categories:');
models.filter(m => m.categories.length > 1).forEach(m => {
  console.log('   ' + m.name + ': ' + m.categories.join(', '));
});
