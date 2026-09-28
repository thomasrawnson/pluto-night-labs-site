import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4321';
const chromePath = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outputDir = path.resolve('docs/screenshots/prelaunch-polish');
const oldSupportEmail = ['help', 'plutonightlabs.com'].join('@');
const failures = [];
const results = [];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: chromePath });

async function inspect({ name, route, viewport }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));

  const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) failures.push(`${name}: HTTP ${response?.status() ?? 'no response'}`);

  const metrics = await page.evaluate(oldEmail => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    hasOldEmail: document.documentElement.innerHTML.includes(oldEmail),
    hasHelloEmail: document.documentElement.innerHTML.includes('hello@plutonightlabs.com'),
  }), oldSupportEmail);
  const overflow = Math.max(metrics.documentWidth, metrics.bodyWidth) > metrics.viewportWidth;
  if (overflow) failures.push(`${name}: horizontal overflow (${Math.max(metrics.documentWidth, metrics.bodyWidth)} > ${metrics.viewportWidth})`);
  if (metrics.hasOldEmail) failures.push(`${name}: old support email remains`);
  if (!metrics.hasHelloEmail) failures.push(`${name}: hello email missing`);
  if (consoleErrors.length) failures.push(`${name}: console errors: ${consoleErrors.join(' | ')}`);

  const screenshot = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  results.push({ name, route, viewport, overflow, consoleErrors, screenshot });
  await context.close();
}

await inspect({ name: 'home-mobile-390x844', route: '/', viewport: { width: 390, height: 844 } });
await inspect({ name: 'home-desktop-1440x900', route: '/', viewport: { width: 1440, height: 900 } });
await inspect({ name: 'contact-desktop-1440x900', route: '/contact/', viewport: { width: 1440, height: 900 } });
await inspect({ name: 'privacy-desktop-1440x900', route: '/privacy/', viewport: { width: 1440, height: 900 } });

const linkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const linkPage = await linkContext.newPage();
for (const route of ['/', '/contact/', '/privacy/']) {
  await linkPage.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
  const hrefs = await linkPage.locator('a[href]').evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute('href')).filter(Boolean))]);
  for (const href of hrefs) {
    if (href.startsWith('mailto:')) continue;
    const url = new URL(href, `${baseURL}${route}`);
    if (url.origin !== new URL(baseURL).origin) continue;
    const response = await linkPage.request.get(url.href.split('#')[0]);
    if (!response.ok()) failures.push(`${route}: broken link ${href} (${response.status()})`);
    if (url.hash && url.pathname === new URL(linkPage.url()).pathname) {
      const exists = await linkPage.locator(url.hash).count();
      if (!exists) failures.push(`${route}: missing anchor ${href}`);
    }
  }
}
await linkContext.close();

const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(baseURL, { waitUntil: 'networkidle' });
const reducedMotion = await reducedPage.evaluate(() => ({
  mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
  scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
}));
if (!reducedMotion.mediaMatches || reducedMotion.scrollBehavior !== 'auto') {
  failures.push(`reduced motion: ${JSON.stringify(reducedMotion)}`);
}
await reducedContext.close();
await browser.close();

console.log(JSON.stringify({ baseURL, reducedMotion, results, failures }, null, 2));
if (failures.length) process.exitCode = 1;
