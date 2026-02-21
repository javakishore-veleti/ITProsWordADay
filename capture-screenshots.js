const { chromium } = require('playwright');
const path = require('path');

const urls = [
  {
    url: 'https://javakishore-veleti.github.io/ITProsWordADay/',
    filename: 'homepage-screenshot.png',
    description: 'Homepage'
  },
  {
    url: 'https://javakishore-veleti.github.io/ITProsWordADay/search/',
    filename: 'search-page-screenshot.png',
    description: 'Search Page'
  },
  {
    url: 'https://javakishore-veleti.github.io/ITProsWordADay/genre/cloud/',
    filename: 'genre-cloud-screenshot.png',
    description: 'Genre Page (Cloud)'
  },
  {
    url: 'https://javakishore-veleti.github.io/ITProsWordADay/word/cloud-001/',
    filename: 'word-detail-screenshot.png',
    description: 'Word Detail Page'
  }
];

(async () => {
  console.log('Starting screenshot capture...\n');
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const screenshotPaths = [];

  for (const item of urls) {
    try {
      console.log(`Navigating to: ${item.description}`);
      console.log(`URL: ${item.url}`);
      
      await page.goto(item.url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait a bit for any animations or lazy loading
      await page.waitForTimeout(2000);
      
      const screenshotPath = path.join(__dirname, item.filename);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      screenshotPaths.push(screenshotPath);
      console.log(`✓ Screenshot saved: ${screenshotPath}\n`);
      
    } catch (error) {
      console.error(`✗ Error capturing ${item.description}:`, error.message, '\n');
    }
  }

  await browser.close();
  
  console.log('Screenshot capture complete!');
  console.log('\nAll screenshot paths:');
  screenshotPaths.forEach(p => console.log(`  - ${p}`));
})();
