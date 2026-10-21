import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4321';
const chromePath = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outputDir = path.resolve(process.env.QA_OUTPUT_DIR ?? 'docs/screenshots/prelaunch-polish');
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
for (const game of ['Personal Effects', 'Gladiator Mayhem', 'Word Lab', "Necromancer's Horde", 'Double or Doom', 'Tiny Heist Planner']) {
  if (!listedGames.includes(game)) failures.push(`/lab/: missing ${game}`);
}
for (const removed of ['Dungeon Care Home', 'Processing the Dead', 'Going, Going, Ghoul!', 'End of the World', 'How Much?!']) {
  if (listedGames.includes(removed)) failures.push(`/lab/: retired listing remains: ${removed}`);
}
if (listedGames.length !== 8) failures.push(`/lab/: expected 8 experiments, found ${listedGames.length}`);

const selectedScreenshotSlugs = ['night-parcel-office', 'personal-effects', 'anomaly-lab', 'tiny-heist-planner'];
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

const flagshipOrder = ['Personal Effects', 'Gladiator Mayhem', 'Word Lab', "Necromancer's Horde"];
if (JSON.stringify(listedGames.slice(0,4)) !== JSON.stringify(flagshipOrder)) {
  failures.push(`/lab/: flagship ordering changed: ${listedGames.slice(0,4).join(', ')}`);
}
if (await linkPage.locator('#main-content main').count()) failures.push('/lab/: nested main landmark is not allowed');
if (!await linkPage.getByRole('heading', { name: 'Explore the experiments.' }).count()) failures.push('/lab/: exploratory heading missing');
if (await linkPage.locator('#gladiator-mayhem .new-badge').textContent() !== 'Playable') failures.push('/lab/: Gladiator Mayhem must be labelled playable');
const conceptArtworkCount = await linkPage.locator('.game-art img[src$=".svg"]').count();
const conceptArtworkLabels = linkPage.locator('.game-art:has(img[src$=".svg"]) .art-caption');
if (await conceptArtworkLabels.count() !== conceptArtworkCount) {
  failures.push(`/lab/: expected ${conceptArtworkCount} concept artwork label(s), found ${await conceptArtworkLabels.count()}`);
}
for (const label of await conceptArtworkLabels.allTextContents()) {
  if (label.trim() !== 'Concept illustration') failures.push(`/lab/: unexpected concept artwork label: ${label}`);
}
if (await linkPage.locator('#word-lab .new-badge').textContent() !== 'Playable') failures.push('/lab/: Word Lab must be labelled playable');
if (await linkPage.locator('#necromancer-s-horde .new-badge').textContent() !== 'In progress') failures.push("/lab/: Necromancer's Horde must be labelled in progress");
const doubleOrDoom = linkPage.locator('#double-or-doom');
if (await doubleOrDoom.locator('.new-badge').textContent() !== 'Playable Prototype') failures.push('/lab/: Double or Doom status is incorrect');
if (await doubleOrDoom.locator('.game-subtitle').textContent() !== "Death's Parlour") failures.push('/lab/: Double or Doom subtitle is incorrect');
if (await doubleOrDoom.locator('.card-content > p:not(.game-subtitle)').textContent() !== 'A dark-fantasy coin-flipping roguelike. Make deadly wagers, manipulate the odds and bargain with Death.') failures.push('/lab/: Double or Doom description is incorrect');
const doubleOrDoomLink = doubleOrDoom.locator('a.play-button');
if (await doubleOrDoomLink.getAttribute('href') !== 'https://double-or-doom.pages.dev') failures.push('/lab/: Double or Doom URL is incorrect');
if (!(await doubleOrDoomLink.textContent())?.includes('Play Now')) failures.push('/lab/: Double or Doom button label is incorrect');
if (await doubleOrDoomLink.getAttribute('target') !== '_blank' || await doubleOrDoomLink.getAttribute('rel') !== 'noopener noreferrer') failures.push('/lab/: Double or Doom external-link safety missing');
if (await linkPage.locator('.clip-details, video').count()) failures.push('/lab/: videos should not appear while recordings are paused');
const gladiatorLink = linkPage.locator('#gladiator-mayhem a.play-button');
if (await gladiatorLink.count() !== 1) {
  failures.push('/lab/: Gladiator Mayhem play link missing');
} else {
  const href = await gladiatorLink.getAttribute('href');
  const target = await gladiatorLink.getAttribute('target');
  const rel = await gladiatorLink.getAttribute('rel');
  if (href !== 'https://gladiator-mayhem.pages.dev') failures.push(`/lab/: incorrect Gladiator Mayhem URL: ${href}`);
  if (target !== '_blank' || rel !== 'noopener noreferrer') failures.push(`/lab/: Gladiator Mayhem external-link safety missing: target=${target}, rel=${rel}`);
}
for (const slug of ['tiny-heist-planner']) {
  const href = await linkPage.locator(`#${slug} a.play-button`).getAttribute('href');
  if (href !== `/playtests/${slug}/`) failures.push(`/lab/: incorrect playtest path for ${slug}: ${href}`);
}
const wordLabLink = linkPage.locator('#word-lab a.play-button');
if (await wordLabLink.getAttribute('href') !== 'https://word-lab-cl1.pages.dev/') failures.push('/lab/: incorrect Word Lab URL');
await linkPage.goto(baseURL, { waitUntil: 'networkidle' });
const headline = await linkPage.locator('#main-content .hero-copy h1').textContent();
if (!headline?.includes('Useful apps.') || !headline?.includes('Strange games.')) failures.push('/: missing app-and-game studio identity');
const featured = await linkPage.locator('#featured .product-card').count();
if (featured !== 3) failures.push(`/: expected 3 featured projects, found ${featured}`);
if (await linkPage.locator('#featured .devpip-card').count()) failures.push('/: DevPip should not be a featured homepage product');
if (!await linkPage.locator('#featured .effects-card').count()) failures.push('/: missing Personal Effects featured card');
if (!await linkPage.locator('#featured .effects-card .shot-print img[src="/images/games/personal-effects/featured.webp"]').count()) {
  failures.push('/: Personal Effects must use approved gameplay screenshot');
}
if (!await linkPage.locator('#games .game-row img[src="/images/games/personal-effects/featured.webp"]').count()) failures.push('/: missing Personal Effects homepage screenshot');
if (!await linkPage.locator('#games .game-row img[src="/lab/gladiator-mayhem.svg"]').count()) failures.push('/: missing Gladiator Mayhem homepage artwork');
if (!await linkPage.locator('#games .game-row .word-tiles').count()) failures.push('/: missing Word Lab homepage artwork');
if (!await linkPage.locator('.site-header .brand').count()) failures.push('/: studio brand missing from navigation');
if (await linkPage.locator('.telemetry').count()) failures.push('/: redundant status strip remains on homepage');

const newsletter = linkPage.locator('section.newsletter');
if (await newsletter.count() !== 1 || !await newsletter.getByRole('heading', { name: 'Join the experiment.' }).count()) {
  failures.push('/: newsletter section missing');
}
const mailerLiteContainers = newsletter.locator('.ml-embedded');
if (await mailerLiteContainers.count() !== 1) {
  failures.push(`/: expected one MailerLite form container, found ${await mailerLiteContainers.count()}`);
} else if (await mailerLiteContainers.getAttribute('data-form') !== 'TQKBpq') {
  failures.push(`/: incorrect MailerLite form ID: ${await mailerLiteContainers.getAttribute('data-form')}`);
}
if (!await newsletter.locator('a[href="/privacy/"]').count()) {
  failures.push('/: newsletter privacy link missing');
}
const mailerLiteLoaderCount = await linkPage.locator('script[src="https://assets.mailerlite.com/js/universal.js"]').count();
if (mailerLiteLoaderCount !== 1) failures.push(`/: expected one MailerLite loader, found ${mailerLiteLoaderCount}`);
const aboutIdCount = await linkPage.locator('[id="about"]').count();
if (aboutIdCount !== 1) failures.push(`/: expected one id="about", found ${aboutIdCount}`);
for (const width of [320, 390]) {
  await linkPage.setViewportSize({ width, height: 844 });
  await linkPage.goto(baseURL, { waitUntil: 'networkidle' });
  for (const selector of ['.shelfpick-card', '.usage-card', '.effects-card']) {
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
for (const game of ['Personal Effects', 'Gladiator Mayhem', 'Word Lab']) {
  if (!homepageGames.includes(game)) failures.push(`/: missing featured game ${game}`);
}
if (homepageGames.length !== 3) failures.push(`/: expected exactly 3 homepage games, found ${homepageGames.length}`);
if (await linkPage.locator('.other-games').count()) failures.push('/: Also in the Lab section should be removed');
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
