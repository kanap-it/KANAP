#!/usr/bin/env node
/**
 * Hover screenshot — captures a page with a specified selector hovered.
 * Useful for dropdowns, tooltips, hover-revealed UI.
 *
 * Usage: node scripts/shoot-hover.mjs <name> <url> <selector>
 */

import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const [name, url, selector] = process.argv.slice(2);
if (!name || !url || !selector) {
  console.error('Usage: shoot-hover.mjs <name> <url> <selector>');
  process.exit(1);
}

mkdirSync('/tmp/kanap-shots', { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

for (const mode of ['light', 'dark']) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: mode }]);
  await page.goto(`${url}?theme=${mode}`, { waitUntil: 'networkidle0' });
  await page.hover(selector);
  await new Promise((r) => setTimeout(r, 400));
  const out = `/tmp/kanap-shots/${name}--hover--${mode}.png`;
  await page.screenshot({ path: out });
  console.log(out);
  await page.close();
}

await browser.close();
