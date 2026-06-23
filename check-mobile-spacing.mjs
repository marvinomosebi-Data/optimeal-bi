import { chromium } from 'playwright';

const url = 'https://optimeal-bi.vercel.app/app/result?budget=2000&appetite=Normal&cafe=1&crave=chicken';

const browser = await chromium.launch();
const page = await browser.newPage();

// iPhone 12 viewport
await page.setViewportSize({ width: 390, height: 844 });
await page.setExtraHTTPHeaders({ 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1' });

await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });

// Wait for the meal plan card to render
await page.waitForSelector('select', { timeout: 10000 }).catch(() => {
  console.log('No select found — may be non-protein result');
});

// Full page screenshot
await page.screenshot({ path: 'mobile-result-full.png', fullPage: true });

// Zoom into the protein row area (first item card)
const cards = page.locator('.rounded-xl.border.border-slate-200.p-4');
const count = await cards.count();
console.log(`Found ${count} item cards`);

if (count > 0) {
  // Screenshot the first few item cards to see the spacing
  for (let i = 0; i < Math.min(count, 3); i++) {
    await cards.nth(i).screenshot({ path: `mobile-item-card-${i}.png` });
  }
}

// Also screenshot just the select + subtitle area if select exists
const selectEl = page.locator('select').first();
const hasSelect = await selectEl.count() > 0;
if (hasSelect) {
  // Get the parent container of the select
  const proteinRow = page.locator('.flex.flex-wrap.items-center.gap-4.rounded-xl').filter({ has: page.locator('select') });
  const rowCount = await proteinRow.count();
  console.log(`Found ${rowCount} protein rows`);
  if (rowCount > 0) {
    await proteinRow.first().screenshot({ path: 'mobile-protein-row.png' });
  }
}

await browser.close();
console.log('Screenshots saved.');
