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
await inspect({ name: 'home-mobile-320x680', route: '/', viewport: { width: 320, height: 680 } });
await inspect({ name: 'home-desktop-1440x900', route: '/', viewport: { width: 1440, height: 900 } });
await inspect({ name: 'products-mobile-390x844', route: '/products/', viewport: { width: 390, height: 844 } });
await inspect({ name: 'products-desktop-1440x900', route: '/products/', viewport: { width: 1440, height: 900 } });
await inspect({ name: 'lab-mobile-390x844', route: '/lab/', viewport: { width: 390, height: 844 } });
await inspect({ name: 'contact-desktop-1440x900', route: '/contact/', viewport: { width: 1440, height: 900 } });
await inspect({ name: 'privacy-desktop-1440x900', route: '/privacy/', viewport: { width: 1440, height: 900 } });

const linkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const linkPage = await linkContext.newPage();
for (const route of ['/', '/products/', '/lab/', '/contact/', '/privacy/']) {
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
// Guard the public product catalogue and Lab lineup against accidental regressions.
await linkPage.goto(`${baseURL}/products/`, { waitUntil: 'networkidle' });
const listedProducts = await linkPage.locator('.catalog-card h3').allTextContents();
for (const product of ['ShelfPick', 'UsageGrid', 'DevPip']) {
  if (!listedProducts.includes(product)) failures.push(`/products/: missing ${product}`);
}

await linkPage.goto(`${baseURL}/lab/`, { waitUntil: 'networkidle' });
const listedGames = await linkPage.locator('.game-card h3').allTextContents();
for (const game of ['Going, Going, Ghoul!', 'Gladiator Mayhem', 'Tiny Heist Planner']) {
  if (!listedGames.includes(game)) failures.push(`/lab/: missing ${game}`);
}
for (const removed of ['End of the World', 'How Much?!']) {
  if (listedGames.includes(removed)) failures.push(`/lab/: retired listing remains: ${removed}`);
}
if (listedGames.length !== 8) failures.push(`/lab/: expected 8 experiments, found ${listedGames.length}`);
const gladiatorLink = await linkPage.locator('#gladiator-mayhem a.play-button').count();
if (gladiatorLink) failures.push('/lab/: Gladiator Mayhem must not claim a playable build');
for (const slug of ['going-going-ghoul', 'tiny-heist-planner']) {
  const href = await linkPage.locator(`#${slug} a.play-button`).getAttribute('href');
  if (href !== `/playtests/${slug}/`) failures.push(`/lab/: incorrect playtest path for ${slug}: ${href}`);
}
await linkPage.goto(baseURL, { waitUntil: 'networkidle' });
const headline = await linkPage.locator('h1').textContent();
if (!headline?.includes('Useful apps.') || !headline?.includes('Strange games.')) failures.push('/: missing app-and-game studio identity');
const featured = await linkPage.locator('#featured .product-card').count();
if (featured !== 3) failures.push(`/: expected 3 featured projects, found ${featured}`);
if (await linkPage.locator('#featured .devpip-card').count()) failures.push('/: DevPip should not be a featured homepage product');
if (!await linkPage.locator('#featured .night-card').count()) failures.push('/: missing Night Parcel Office featured card');
if (!await linkPage.locator('.studio-mark').getByText('PLUTO NIGHT LABS').count()) failures.push('/: studio strip still has abbreviated branding');
for (const width of [320, 390]) {
  await linkPage.setViewportSize({ width, height: 844 });
  await linkPage.goto(baseURL, { waitUntil: 'networkidle' });
  for (const selector of ['.shelfpick-card', '.usage-card', '.night-card']) {
    const metrics = await linkPage.locator(selector).evaluate((card) => {
      const visual = card.querySelector('.game-visual, .usage-visual, .night-visual');
      const copy = card.querySelector('.product-content');
      const link = card.querySelector('.feature-card-link');
      if (!visual || !copy || !link) return null;
      const imageBox = visual.getBoundingClientRect();
      const copyBox = copy.getBoundingClientRect();
      const linkBox = link.getBoundingClientRect();
      return { visualTop: imageBox.top, contentBottom: copyBox.bottom, linkBottom: linkBox.bottom };
    });
    if (!metrics || metrics.visualTop + 1 < Math.max(metrics.contentBottom, metrics.linkBottom)) {
      failures.push(`/: artwork overlaps copy at ${width}px in ${selector}: ${JSON.stringify(metrics)}`);
    }
  }
}
await linkPage.setViewportSize({ width: 1440, height: 900 });
const homepageGames = await linkPage.locator('#games .lab-card h3').allTextContents();
for (const game of ['Personal Effects', 'Anomaly Lab', 'Going, Going, Ghoul!']) {
  if (!homepageGames.includes(game)) failures.push(`/: missing featured game ${game}`);
}
if (homepageGames.length !== 3) failures.push(`/: expected exactly 3 prominent homepage games, found ${homepageGames.length}`);
if (!await linkPage.locator('.more-lab-links a[href="/lab/#tiny-heist-planner"]').count()) failures.push('/: missing Tiny Heist Planner secondary link');
if (!await linkPage.locator('.more-lab-links a[href="/lab/#gladiator-mayhem"]').count()) failures.push('/: missing Gladiator Mayhem secondary link');
if (await linkPage.locator('h3').filter({ hasText: 'End of the World' }).count()) {
  failures.push('/: retired End of the World feature remains');
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
