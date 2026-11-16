// Renders the Actby concept screens used on /actby/ from docs/actby-concept/prototype-source.html.
// The source is the owner's design prototype (made-up data). A sanitised in-memory copy is rendered:
//  - real car model and calendar brand removed (site rule: no real brands)
//  - example statistics hidden ("cost you £X last year", renewal-quote percentage, "this year so far" tiles)
//  - Google Fonts link removed; Fraunces + Inter loaded from public/fonts (no third-party requests)
// Run:  node scripts/actby-concept-screens.mjs   (writes PNGs to public/images/actby/)
import { chromium } from 'playwright-core';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const chromePath = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outDir = path.resolve(process.env.CONCEPT_OUT ?? 'public/images/actby');
const fontsDir = path.resolve('public/fonts');
const source = await readFile('docs/actby-concept/prototype-source.html', 'utf8');

const mustReplace = (s, from, to) => {
  if (!s.includes(from)) throw new Error(`prototype changed: cannot find ${JSON.stringify(from.slice(0, 60))}`);
  return s.split(from).join(to);
};

let html = source;
// fonts
html = html.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/, '');
html = mustReplace(html, "'Instrument Serif'", 'Fraunces');
html = mustReplace(html, '<style id="st">', `<style id="st">
@font-face{font-family:Fraunces;font-weight:100 900;src:url('${pathToFileURL(path.join(fontsDir, 'fraunces-latin-var.woff2'))}') format('woff2')}
@font-face{font-family:Inter;font-weight:100 900;src:url('${pathToFileURL(path.join(fontsDir, 'inter-latin-var.woff2'))}') format('woff2')}
body{background:transparent!important;padding:0!important}.intro,.themes{display:none!important}.phone{box-shadow:none!important}`);
// real brands
html = mustReplace(html, 'Ford Fiesta', 'Family car');
html = mustReplace(html, 'Synced to Apple Calendar', 'Synced to your calendar');
// example statistics
html = mustReplace(html, ' cost you <span class="serif" style="font-size:24px">${money(tot)}</span> last year. Compare before their act-by dates.', ' both renew soon. Compare before their act-by dates.');
html = mustReplace(html, 'quote:689', 'quote:null');
html = mustReplace(html, 'quote:540', 'quote:null');
html = html.replace(/ <div class="label">This year so far<\/div>\n <div style="display:grid;[^\n]*switched to a new provider<\/div><\/div><\/div>\n/, '');
if (html.includes('This year so far')) throw new Error('prototype changed: household statistics not removed');

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const context = await browser.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 });
const external = [];
let page;

const shot = async (name) => {
  await page.waitForTimeout(500);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#phone').screenshot({ path: path.join(outDir, `${name}.png`), omitBackground: true });
  console.log('wrote', name);
};
const load = async () => {
  if (page) await page.close();
  page = await context.newPage();
  page.on('request', (r) => { if (!/^(file|data|about):/.test(r.url())) external.push(r.url()); });
  await page.route('**/*', (route) => (/^(file|data|about):/.test(route.request().url()) ? route.continue() : route.abort()));
  await page.setContent(html, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{background:transparent}' });
};

// 1. Up next
await load();
await shot('concept-up-next');
// 2. Act-by date (car insurance)
await page.click('[data-open="1"]');
await shot('concept-act-by');
// 3. Snap a letter, read result
await load();
await page.click('[data-sheet="add"]');
await page.click('[data-snap]');
await page.waitForTimeout(1700);
await shot('concept-snap-letter');
// 4. Household
await load();
await page.click('[data-tab="house"]');
await shot('concept-household');

const text = await page.evaluate(() => document.body.innerText);
for (const banned of ['Ford', 'Apple', '£1,086', '+13%']) if (text.includes(banned)) throw new Error(`banned text on final screen: ${banned}`);
await browser.close();
if (external.length) { console.error('unexpected external requests:', external); process.exit(1); }
console.log('done; no external requests');
