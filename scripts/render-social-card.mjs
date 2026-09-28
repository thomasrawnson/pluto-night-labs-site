import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'scripts/social-card.html');
const output = path.join(root, 'public/images/pluto-night-labs-social.png');
const chromePath = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

await mkdir(path.dirname(output), { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`file://${source}`, { waitUntil: 'networkidle' });
await page.locator('.social-card').screenshot({ path: output });
await browser.close();

console.log(`Rendered ${path.relative(root, output)} at 1200x630.`);
