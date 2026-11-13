import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4324';
const chromePath = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outputDir = path.resolve(process.env.QA_OUTPUT_DIR ?? 'docs/screenshots/sp-web-01');
const failures = [];
const results = [];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: chromePath });

const expected = {
  '/shelfpick/': {
    title: 'ShelfPick — Spend less time choosing. Spend more time playing.',
    description: 'Organise your board-game collection, find the right game for your group and remember every game night with ShelfPick.',
  },
  '/shelfpick/support/': {
    title: 'ShelfPick Support | Pluto Night Labs',
    description: 'Help with your ShelfPick account, collection, BoardGameGeek import, Picker, play history and account deletion.',
  },
};

async function auditContrast(page) {
  return page.evaluate(() => {
    const parse = value => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(/[ ,/]+/).map(Number);
      return { r: parts[0], g: parts[1], b: parts[2], a: Number.isFinite(parts[3]) ? parts[3] : 1 };
    };
    const luminance = color => {
      const channel = value => {
        const normal = value / 255;
        return normal <= .04045 ? normal / 12.92 : ((normal + .055) / 1.055) ** 2.4;
      };
      return .2126 * channel(color.r) + .7152 * channel(color.g) + .0722 * channel(color.b);
    };
    const ratio = (foreground, background) => {
      const first = luminance(foreground);
      const second = luminance(background);
      return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
    };
    return [...document.querySelectorAll('.shelfpick-page *')].flatMap(element => {
      if (![...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) return [];
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return [];
      let ancestor = element;
      let background = null;
      while (ancestor && !background) {
        const candidate = parse(getComputedStyle(ancestor).backgroundColor);
        if (candidate?.a > .95) background = candidate;
        ancestor = ancestor.parentElement;
      }
      const foreground = parse(style.color);
      if (!foreground || !background) return [];
      const contrast = ratio(foreground, background);
      const size = Number.parseFloat(style.fontSize);
      const weight = Number.parseInt(style.fontWeight, 10) || 400;
      const minimum = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
      return contrast + .01 < minimum ? [{ text: element.textContent.trim().slice(0, 80), contrast, minimum }] : [];
    });
  });
}

async function inspect({ name, route, viewport, colorScheme = 'light', screenshot = false }) {
  const context = await browser.newContext({ viewport, colorScheme });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => consoleErrors.push(error.message));
  const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) failures.push(`${name}: HTTP ${response?.status() ?? 'no response'}`);
  if (route === '/shelfpick/') {
    const screenshotStrip = page.locator('.screenshot-strip');
    await screenshotStrip.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('.screenshot-strip img')].every(image => image.complete && image.naturalWidth > 0));
    await page.locator('.screenshot-strip img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    if (viewport.width <= 820) {
      await screenshotStrip.focus();
      const focusStyle = await screenshotStrip.evaluate(element => {
        const style = getComputedStyle(element);
        return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
      });
      if (focusStyle.outlineStyle === 'none' || focusStyle.outlineWidth === '0px') failures.push(`${name}: screenshot gallery focus is not visibly rendered`);
      const scrollBefore = await screenshotStrip.evaluate(element => element.scrollLeft);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(450);
      const scrollAfter = await screenshotStrip.evaluate(element => element.scrollLeft);
      if (scrollAfter <= scrollBefore) failures.push(`${name}: keyboard does not scroll the screenshot gallery`);
      await screenshotStrip.evaluate(element => { element.scrollTo({ left: 0, behavior: 'instant' }); });
      await page.waitForFunction(() => {
        const strip = document.querySelector('.screenshot-strip');
        return strip && Math.abs(strip.scrollLeft) < 1;
      });
      await page.waitForTimeout(300);
      const initialAlignment = await screenshotStrip.evaluate(element => ({
        scrollLeft: element.scrollLeft,
        containerLeft: element.getBoundingClientRect().left,
        firstLeft: element.querySelector('figure')?.getBoundingClientRect().left,
      }));
      if (initialAlignment.firstLeft == null || initialAlignment.firstLeft < initialAlignment.containerLeft - 1) {
        failures.push(`${name}: first gallery card is clipped at initial position ${JSON.stringify(initialAlignment)}`);
      }
    }
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);
    });
    await page.waitForFunction(() => window.scrollY === 0);
    await page.waitForTimeout(100);
  }

  const metrics = await page.evaluate(() => {
    const root = document.querySelector('.shelfpick-page');
    const images = [...document.images].map(image => ({ src: image.getAttribute('src'), complete: image.complete, naturalWidth: image.naturalWidth }));
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const ogImage = document.querySelector('meta[property="og:image"]')?.content;
    const ogUrl = document.querySelector('meta[property="og:url"]')?.content;
    return {
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      canonical,
      ogUrl,
      ogImage,
      background: root ? getComputedStyle(root).backgroundColor : '',
      images,
      forms: document.forms.length,
      text: document.body.innerText,
    };
  });
  const width = Math.max(metrics.documentWidth, metrics.bodyWidth);
  if (width > metrics.viewportWidth) failures.push(`${name}: horizontal overflow (${width} > ${metrics.viewportWidth})`);
  if (metrics.title !== expected[route].title) failures.push(`${name}: unexpected title ${JSON.stringify(metrics.title)}`);
  if (metrics.description !== expected[route].description) failures.push(`${name}: unexpected description`);
  const expectedCanonical = `https://plutonightlabs.com${route}`;
  if (metrics.canonical !== expectedCanonical || metrics.ogUrl !== expectedCanonical) failures.push(`${name}: canonical/og:url mismatch`);
  if (metrics.ogImage !== 'https://plutonightlabs.com/images/shelfpick/social-profile-1024.png') failures.push(`${name}: ShelfPick social image missing`);
  if (metrics.images.some(image => !image.complete || image.naturalWidth === 0)) failures.push(`${name}: unloaded image ${JSON.stringify(metrics.images)}`);
  if (consoleErrors.length) failures.push(`${name}: console errors: ${consoleErrors.join(' | ')}`);
  if (/QR voting|£3\.99|Buy Pro|purchase Pro/i.test(metrics.text)) failures.push(`${name}: unavailable feature or purchase copy found`);
  if (route === '/shelfpick/' && await page.locator('a[href*="apps.apple.com"]').count()) failures.push(`${name}: App Store link must not exist yet`);
  if (route === '/shelfpick/' && await page.locator('.availability-status', { hasText: 'App Store — coming soon' }).count() !== 1) failures.push(`${name}: App Store availability status missing`);
  if (route === '/shelfpick/' && await page.locator('.availability-status:is(a, button), .availability-status[aria-disabled="true"]').count()) failures.push(`${name}: App Store status is misleadingly interactive`);
  if (route === '/shelfpick/' && await page.locator('img[src="/images/shelfpick/screenshots/picker-recommendation.png"]').count() !== 1) failures.push(`${name}: recommendation-result screenshot missing`);
  if (route === '/shelfpick/' && await page.locator('.screenshot-strip img').count() !== 4) failures.push(`${name}: screenshot showcase is incomplete`);
  if (route === '/shelfpick/' && viewport.width <= 820 && await page.locator('#gallery-scroll-hint:visible').count() !== 1) failures.push(`${name}: mobile gallery scroll hint missing`);
  if (route === '/shelfpick/' && await page.locator('.screenshot-strip[tabindex="0"][aria-describedby="gallery-scroll-hint"]').count() !== 1) failures.push(`${name}: gallery keyboard or assistive description missing`);
  if (route === '/shelfpick/' && await page.locator('.trust a[href*="privacy"]').count()) failures.push(`${name}: studio privacy link is presented as ShelfPick-specific`);
  if (await page.locator('footer.night-footer a[href="/privacy/"]').count() !== 1) failures.push(`${name}: global studio privacy link missing or duplicated`);
  if (route === '/shelfpick/support/' && metrics.forms !== 0) failures.push(`${name}: support page must not add a form`);
  const contrastIssues = await auditContrast(page);
  if (contrastIssues.length) failures.push(`${name}: contrast failures ${JSON.stringify(contrastIssues)}`);

  const screenshotPath = screenshot ? path.join(outputDir, `${name}.png`) : null;
  if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true });

  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) return null;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { tag: element.tagName, text: element.innerText || element.getAttribute('aria-label'), outline: style.outlineStyle, width: rect.width, height: rect.height };
  });
  if (!focused || focused.outline === 'none' || focused.width <= 0 || focused.height <= 0) failures.push(`${name}: first keyboard focus is not visibly rendered ${JSON.stringify(focused)}`);

  results.push({ name, route, viewport, colorScheme, background: metrics.background, screenshot: screenshotPath });
  await context.close();
}

await inspect({ name: 'landing-mobile-390x844', route: '/shelfpick/', viewport: { width: 390, height: 844 }, screenshot: true });
await inspect({ name: 'landing-mobile-320x568', route: '/shelfpick/', viewport: { width: 320, height: 568 }, screenshot: true });
await inspect({ name: 'landing-tablet-768x1024', route: '/shelfpick/', viewport: { width: 768, height: 1024 }, screenshot: true });
await inspect({ name: 'landing-desktop-1440x900', route: '/shelfpick/', viewport: { width: 1440, height: 900 }, screenshot: true });
await inspect({ name: 'support-mobile-390x844', route: '/shelfpick/support/', viewport: { width: 390, height: 844 }, screenshot: true });
await inspect({ name: 'support-mobile-320x568', route: '/shelfpick/support/', viewport: { width: 320, height: 568 } });
await inspect({ name: 'support-desktop-1440x900', route: '/shelfpick/support/', viewport: { width: 1440, height: 900 }, screenshot: true });
await inspect({ name: 'landing-dark-390x844', route: '/shelfpick/', viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
await inspect({ name: 'support-dark-1440x900', route: '/shelfpick/support/', viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });

const linkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const linkPage = await linkContext.newPage();
for (const route of Object.keys(expected)) {
  await linkPage.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
  const hrefs = await linkPage.locator('a[href]').evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute('href')).filter(Boolean))]);
  for (const href of hrefs) {
    if (href.startsWith('mailto:')) continue;
    const url = new URL(href, `${baseURL}${route}`);
    if (url.origin !== new URL(baseURL).origin) continue;
    const response = await linkPage.request.get(url.href);
    if (!response.ok()) failures.push(`${route}: internal link ${url.pathname} returned ${response.status()}`);
  }
}
await linkPage.goto(`${baseURL}/products/shelfpick/`, { waitUntil: 'networkidle' });
if (await linkPage.locator('link[rel="canonical"]').getAttribute('href') !== 'https://plutonightlabs.com/shelfpick/') failures.push('legacy ShelfPick page does not canonicalise to /shelfpick/');
await linkPage.goto(`${baseURL}/software/`, { waitUntil: 'networkidle' });
if (!await linkPage.locator('a[href="/shelfpick/"]').count()) failures.push('/software/: ShelfPick does not link to the approved route');

const brokenPage = await linkContext.newPage();
await brokenPage.route('**/images/shelfpick/screenshots/picker-recommendation.png', route => route.abort());
await brokenPage.goto(`${baseURL}/shelfpick/`, { waitUntil: 'networkidle' });
const fallback = await brokenPage.locator('img[alt^="ShelfPick Picker recommendation"]').evaluate(image => {
  const rect = image.getBoundingClientRect();
  return { complete: image.complete, naturalWidth: image.naturalWidth, width: rect.width, height: rect.height, alt: image.alt };
});
if (fallback.naturalWidth !== 0 || fallback.width < 200 || fallback.height < 400 || !fallback.alt) failures.push(`missing-image fallback collapsed: ${JSON.stringify(fallback)}`);

await linkContext.close();
await browser.close();

console.log(JSON.stringify({ baseURL, results, failures }, null, 2));
if (failures.length) process.exitCode = 1;
