const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://www.bjorkmansbil.se/modeller/kia-ev4-fastback/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  
  await page.waitForTimeout(3000);
  
  // Debug: Check what tabs exist
  const tabs = await page.evaluate(() => {
    const results = {
      allLinks: [],
      navTabs: [],
      buttons: [],
      financingSection: null
    };
    
    // Find all links
    document.querySelectorAll('a[href]').forEach(a => {
      const text = a.textContent.trim();
      const href = a.getAttribute('href');
      if (text.toLowerCase().includes('billån') || 
          text.toLowerCase().includes('leasing') ||
          text.toLowerCase().includes('finansier')) {
        results.allLinks.push({ text, href });
      }
    });
    
    // Find nav tabs specifically
    document.querySelectorAll('.tabs a, [role="tab"], .tab').forEach(tab => {
      results.navTabs.push({
        tag: tab.tagName,
        text: tab.textContent.trim(),
        href: tab.getAttribute('href'),
        className: tab.className
      });
    });
    
    // Find buttons
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent.trim();
      if (text) {
        results.buttons.push(text);
      }
    });
    
    // Check for financing section
    const financingHeader = document.querySelector('h2, h3, .h2, .h3');
    if (financingHeader) {
      results.financingSection = financingHeader.textContent;
    }
    
    return results;
  });
  
  console.log('Debug Results:');
  console.log('='.repeat(60));
  console.log('\nFinancing-related links:', JSON.stringify(tabs.allLinks, null, 2));
  console.log('\nNav tabs:', JSON.stringify(tabs.navTabs, null, 2));
  console.log('\nButtons (first 10):', tabs.buttons.slice(0, 10));
  console.log('\nFinancing section:', tabs.financingSection);
  
  await browser.close();
})();
