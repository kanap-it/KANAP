#!/usr/bin/env node
/**
 * Screenshot runner (puppeteer-core + system chromium).
 *
 * Usage:
 *   node scripts/shoot.mjs                     # capture the default set
 *   node scripts/shoot.mjs home offer          # only named routes
 *   node scripts/shoot.mjs --base http://localhost:4321 --full
 *
 * Output:
 *   /tmp/kanap-shots/<name>--<viewport>--<mode>.png
 *
 * Requirements:
 *   - chromium installed on the system at /usr/bin/chromium (default)
 *   - astro preview server running at the base URL (default localhost:4321)
 */

import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const OUT_DIR = '/tmp/kanap-shots';
const CHROME_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium';

const args = process.argv.slice(2);
function flag(name, def) {
  const i = args.indexOf('--' + name);
  if (i === -1) return def;
  return args[i + 1];
}
function has(name) {
  return args.includes('--' + name);
}

const BASE = flag('base', 'http://localhost:4321');
const FULL_PAGE = has('full');
const viewports = [{ w: 1440, h: 900, tag: 'desktop' }];
if (has('mobile')) viewports.push({ w: 390, h: 844, tag: 'mobile' });

const ROUTES = {
  home: '/',
  offer: '/offer',
  'on-premise': '/on-premise',
  features: '/features',
  'features-budget': '/features/budget',
  'features-it-landscape': '/features/it-landscape',
  'features-portfolio': '/features/portfolio',
  'features-knowledge': '/features/knowledge',
  'features-ai': '/features/ai',
  'trial-start': '/trial/start',
  'trial-check-email': '/trial/check-email',
  'trial-expired': '/trial/expired',
  faq: '/faq',
  security: '/security',
  changelog: '/changelog',
  contact: '/contact',
  privacy: '/privacy',
  home_fr: '/fr',
  home_de: '/de',
  home_es: '/es',
};

const positional = args.filter((a) => !a.startsWith('--'));
const selected = positional.length
  ? Object.fromEntries(positional.filter((k) => ROUTES[k]).map((k) => [k, ROUTES[k]]))
  : ROUTES;

mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

try {
  for (const [name, path] of Object.entries(selected)) {
    for (const vp of viewports) {
      for (const mode of ['light', 'dark']) {
        const page = await browser.newPage();
        await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
        // Emulate the chosen color scheme — this is what matters
        // for the prefers-color-scheme media query if data-theme
        // isn't set yet. We also pass ?theme= for explicit data-theme.
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: mode }]);

        const url = `${BASE}${path}?theme=${mode}`;
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
        // Settle a frame for any post-paint theme sync (icon swaps, etc.)
        await new Promise((r) => setTimeout(r, 150));

        const out = `${OUT_DIR}/${name}--${vp.tag}--${mode}.png`;
        await page.screenshot({ path: out, fullPage: FULL_PAGE });
        console.log(out);
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
