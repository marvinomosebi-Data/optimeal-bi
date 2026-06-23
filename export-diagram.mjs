import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const xml = readFileSync('figure-3.1-system-architecture.drawio', 'utf8');
const encoded = encodeURIComponent(xml);

// draw.io viewer embed URL — renders the diagram with no UI chrome
const url = `https://viewer.diagrams.net/?highlight=0&edit=_blank&layers=1&nav=0&page=0#R${encoded}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// 2400 × 1600 viewport at deviceScaleFactor 2 = effective 4800×3200 canvas
await page.setViewportSize({ width: 2400, height: 1600 });

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

// wait for the mxGraph canvas to finish rendering
await page.waitForSelector('.mxgraph-diagram, svg, canvas', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(4000);

// try to screenshot just the diagram container if found
const diagramEl = await page.$('.mxgraph-diagram, .geDiagram, #mxgraph, svg');
if (diagramEl) {
  await diagramEl.screenshot({ path: 'figure-3.1-system-architecture.png' });
  console.log('Exported diagram element as PNG');
} else {
  // fallback: full page screenshot
  await page.screenshot({
    path: 'figure-3.1-system-architecture.png',
    fullPage: false,
    clip: { x: 0, y: 0, width: 2400, height: 1600 },
  });
  console.log('Exported full-page screenshot as PNG');
}

await browser.close();
console.log('Done → figure-3.1-system-architecture.png');
