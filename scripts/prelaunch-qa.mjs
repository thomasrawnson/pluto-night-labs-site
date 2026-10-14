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
await inspect({ name: 'products-mobile-320x680', route: '/products/', viewport: { width: 320, height: 680 } });
await inspect({ name: 'products-mobile-390x844', route: '/products/', viewport: { width: 390, height: 844 } });
await inspect({ name: 'products-desktop-1440x900', route: '/products/', viewport: { width: 1440, height: 900 } });
await inspect({ name: 'shelfpick-mobile-320x680', route: '/products/shelfpick/', viewport: { width: 320, height: 680 } });
await inspect({ name: 'usagegrid-mobile-390x844', route: '/products/usagegrid/', viewport: { width: 390, height: 844 } });
await inspect({ name: 'lab-mobile-320x680', route: '/lab/', viewport: { width: 320, height: 680 } });
await inspect({ name: 'lab-mobile-390x844', route: '/lab/', viewport: { width: 390, height: 844 } });
await inspect({ name: 'lab-desktop-1440x900', route: '/lab/', viewport: { width: 1440, height: 900 } });
await inspect({ name: 'playtest-invite-mobile-320x680', route: '/playtests/join/', viewport: { width: 320, height: 680 } });
await inspect({ name: 'contact-desktop-1440x900', route: '/contact/', viewport: { width: 1440, height: 900 } });
await inspect({ name: 'privacy-desktop-1440x900', route: '/privacy/', viewport: { width: 1440, height: 900 } });

const linkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const linkPage = await linkContext.newPage();
for (const route of ['/', '/products/', '/products/shelfpick/', '/products/usagegrid/', '/lab/', '/playtests/join/', '/contact/', '/privacy/']) {
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
// The three pages must share the minimal homepage background and avoid excessive hero whitespace.
const designMetrics = {};
for (const route of ['/', '/lab/', '/products/']) {
  await linkPage.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
  designMetrics[route] = await linkPage.evaluate(() => {
    const page = document.querySelector('#main-content');
    const hero = document.querySelector('h1');
    const header = document.querySelector('.site-header');
    const surface = page ? getComputedStyle(page) : null;
    return {
      background: surface?.backgroundColor ?? '',
      texture: surface?.backgroundImage ?? '',
      heroTopGap: hero && header ? hero.getBoundingClientRect().top - header.getBoundingClientRect().bottom : null,
    };
  });
}
for (const route of ['/lab/', '/products/']) {
  if (designMetrics[route].background !== designMetrics['/'].background) {
    failures.push(`${route}: background colour does not match homepage`);
  }
  if (!designMetrics[route].texture.includes('radial-gradient')) {
    failures.push(`${route}: minimal homepage dot texture missing`);
  }
  if (designMetrics[route].heroTopGap === null || designMetrics[route].heroTopGap > 160) {
    failures.push(`${route}: hero too far from header: ${JSON.stringify(designMetrics[route].heroTopGap)}px`);
  }
}

// Guard the public product catalogue and Lab lineup against accidental regressions.
await linkPage.goto(`${baseURL}/products/`, { waitUntil: 'networkidle' });
const listedProducts = await linkPage.locator('.catalog-card h3').allTextContents();
for (const product of ['ShelfPick', 'UsageGrid', 'DevPip']) {
  if (!listedProducts.includes(product)) failures.push(`/products/: missing ${product}`);
}
for (const slug of ['shelfpick', 'usagegrid']) {
  const target = await linkPage.locator(`#${slug} .catalog-link`).getAttribute('href');
  if (target !== `/products/${slug}/`) failures.push(`/products/: missing detail link for ${slug}`);
}
for (const slug of ['shelfpick', 'usagegrid']) {
  await linkPage.goto(`${baseURL}/products/${slug}/`, { waitUntil: 'networkidle' });
  if (!await linkPage.getByRole('heading', { name: slug === 'shelfpick' ? 'ShelfPick' : 'UsageGrid', level:1 }).count()) {
    failures.push(`/products/${slug}/: expected product detail heading`);
  }
  if (!await linkPage.locator('.feature').count()) failures.push(`/products/${slug}/: features missing`);
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

const selectedScreenshotSlugs = ['night-parcel-office', 'personal-effects', 'anomaly-lab', 'going-going-ghoul', 'tiny-heist-planner'];
for (const slug of selectedScreenshotSlugs) {
  const selector = `#${slug} .game-art img`;
  const media = await linkPage.locator(selector).evaluate((img) => ({
    src: img.getAttribute('src'),
    fallback: img.getAttribute('data-fallback'),
    loaded: img.complete && img.naturalWidth > 0,
  }));
  if (media.src !== `/images/games/${slug}/featured.webp`) {
    failures.push(`/lab/: screenshot path mismatch for ${slug}: ${media.src}`);
  }
  const asset = await linkPage.request.get(`${baseURL}/images/games/${slug}/featured.webp`);
  if (!asset.ok()) failures.push(`/lab/: screenshot asset missing for ${slug} (${asset.status()})`);
  if (!media.loaded) failures.push(`/lab/: media failed to load for ${slug}`);
}

const flagshipOrder = ['Night Parcel Office', 'Personal Effects', 'Anomaly Lab'];
if (JSON.stringify(listedGames.slice(0,3)) !== JSON.stringify(flagshipOrder)) {
  failures.push(`/lab/: flagship ordering changed: ${listedGames.slice(0,3).join(', ')}`);
}
if (await linkPage.locator('#main-content main').count()) failures.push('/lab/: nested main landmark is not allowed');
if (!await linkPage.getByRole('heading', { name: 'Explore the experiments.' }).count()) failures.push('/lab/: exploratory heading missing');
if (!await linkPage.locator('#gladiator-mayhem .new-badge').count()) failures.push('/lab/: missing in-development state');
if (await linkPage.locator('.art-caption').count() !== 3) failures.push('/lab/: concept artwork not labelled');
// Release check: run with REQUIRE_GAME_CLIPS=1 after video files are committed.
if (process.env.REQUIRE_GAME_CLIPS === '1') {
  for (const [slug, title] of [['personal-effects','Personal Effects'], ['anomaly-lab','Anomaly Lab']]) {
    const video = linkPage.locator(`#${slug} video`);
    if (!await video.count()) failures.push(`/lab/: gameplay clip missing for ${title}`);
    else {
      const src = await video.locator('source').getAttribute('src');
      const response = await linkPage.request.get(new URL(src, baseURL).href);
      if (!response.ok()) failures.push(`/lab/: video HTTP ${response.status()} for ${title}`);
      if (await video.getAttribute('autoplay') !== null) failures.push(`/lab/: video must not autoplay for ${title}`);
    }
  }
}
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
if (!await linkPage.locator('#featured .night-card .shot-print img[src="/images/games/night-parcel-office/featured.webp"]').count()) {
  failures.push('/: Night Parcel Office must use approved gameplay screenshot');
}
for (const slug of ['personal-effects', 'anomaly-lab', 'going-going-ghoul']) {
  if (!await linkPage.locator(`#games .game-row img[src="/images/games/${slug}/featured.webp"]`).count()) {
    failures.push(`/: missing homepage screenshot for ${slug}`);
  }
}
if (!await linkPage.locator('.site-header .brand').count()) failures.push('/: studio brand missing from navigation');
if (await linkPage.locator('.telemetry').count()) failures.push('/: redundant status strip remains on homepage');
for (const width of [320, 390]) {
  await linkPage.setViewportSize({ width, height: 844 });
  await linkPage.goto(baseURL, { waitUntil: 'networkidle' });
  for (const selector of ['.shelfpick-card', '.usage-card', '.night-card']) {
    const metrics = await linkPage.locator(selector).evaluate(card => {
      const visual = card.querySelector('.project-art');
      const copy = card.querySelector('.product-content');
      if (!visual || !copy) return null;
      const imageBox = visual.getBoundingClientRect();
      const copyBox = copy.getBoundingClientRect();
      return { image: { left:imageBox.left,right:imageBox.right,top:imageBox.top,bottom:imageBox.bottom },
        copy: { left:copyBox.left,right:copyBox.right,top:copyBox.top,bottom:copyBox.bottom } };
    });
    const overlap = metrics && metrics.image.left < metrics.copy.right - 1 && metrics.copy.left < metrics.image.right - 1 &&
      metrics.image.top < metrics.copy.bottom - 1 && metrics.copy.top < metrics.image.bottom - 1;
    if (!metrics || overlap) failures.push(`/: artwork overlaps copy at ${width}px in ${selector}: ${JSON.stringify(metrics)}`);
  }
}
await linkPage.setViewportSize({ width: 1440, height: 900 });
const homepageGames = await linkPage.locator('#games .game-row .game-copy strong').allTextContents();
for (const game of ['Personal Effects', 'Anomaly Lab', 'Going, Going, Ghoul!']) {
  if (!homepageGames.includes(game)) failures.push(`/: missing featured game ${game}`);
}
if (homepageGames.length !== 3) failures.push(`/: expected exactly 3 homepage games, found ${homepageGames.length}`);
if (!await linkPage.locator('.other-games a[href="/lab/#tiny-heist-planner"]').count()) failures.push('/: missing Tiny Heist Planner secondary link');
if (!await linkPage.locator('.other-games a[href="/lab/#gladiator-mayhem"]').count()) failures.push('/: missing Gladiator Mayhem secondary link');
if (!await linkPage.locator('.moon').count()) failures.push('/: orbital interaction controls absent');
const orbitalArcs = await linkPage.locator('.orbit-front').evaluateAll(nodes => nodes.map(node => {
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  return { width: rect.width, height: rect.height, bottomBorder: style.borderBottomColor };
}));
if (orbitalArcs.length !== 2 || orbitalArcs.some(a => a.width < 100 || a.height < 60 || !a.bottomBorder)) {
  failures.push(`/: foreground orbit arcs missing: ${JSON.stringify(orbitalArcs)}`);
}
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
