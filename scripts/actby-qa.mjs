// ACT-WEB-01 QA for /actby/: viewports, tap targets, mailto behaviour and axe.
// Run against a preview server:  npm run build && npm run preview &  npm run qa:actby
// BROWSER VIEWPORT PASS / AUTOMATED PASS evidence only; not physical-device evidence.
import { chromium } from 'playwright-core';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4321';
// Uses the headless shell already in the Playwright cache: it cannot hand mailto: links to the OS mail app
// (the installed Chrome does, which opens real Mail compose windows). Override with CHROME_PATH only if you must.
import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
const cache = path.join(homedir(), 'Library/Caches/ms-playwright');
const shellDir = readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-')).sort().pop();
const shellBin = shellDir && readdirSync(path.join(cache, shellDir)).map((d) => path.join(cache, shellDir, d, 'chrome-headless-shell')).find((f) => { try { return readdirSync(path.dirname(f)).includes('chrome-headless-shell'); } catch { return false; } });
const chromePath = process.env.CHROME_PATH ?? shellBin;
if (!chromePath) throw new Error('No headless shell found in the Playwright cache; refusing to use the installed Chrome (it opens Mail drafts).');
const axePath = process.env.AXE_PATH; // path to an existing axe-core axe.min.js (no install performed)
const outputDir = path.resolve(process.env.QA_OUTPUT_DIR ?? 'docs/screenshots/act-web-01');
const route = '/actby/';
const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: chromePath });

const viewports = [
  { name: 'actby-320x680', width: 320, height: 680 },
  { name: 'actby-390x844', width: 390, height: 844 },
  { name: 'actby-430x932', width: 430, height: 932 },
  { name: 'actby-1440x900', width: 1440, height: 900 },
];

// 1. Viewports: no horizontal scroll, readable text, tap targets >= 44px, no console errors.
for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.width < 600 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  const res = await page.goto(baseURL + route, { waitUntil: 'networkidle' });
  if (!res?.ok()) fail(`${vp.name}: HTTP ${res?.status()}`);

  const m = await page.evaluate(() => {
    const root = document.querySelector('.actby');
    const vw = window.innerWidth;
    const small = [];
    const targets = root.querySelectorAll('a[href], button, summary, input:not([type=hidden])');
    for (const el of targets) {
      // Checkbox/radio: the clickable area is the wrapping label.
      const box = (el.matches('input[type=checkbox], input[type=radio]') ? el.closest('label') ?? el : el).getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      if (box.height < 43.5 || box.width < 43.5) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('name') || '').trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`);
    }
    let minFont = 99;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.textContent.trim()) continue;
      const fs = parseFloat(getComputedStyle(n.parentElement).fontSize);
      if (fs < minFont) minFont = fs;
    }
    const overflowing = [...root.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > vw + 0.5 && getComputedStyle(e).position !== 'fixed').slice(0, 5).map((e) => e.tagName + '.' + e.className);
    return { vw, docW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth, small, minFont, overflowing };
  });
  if (Math.max(m.docW, m.bodyW) > m.vw) fail(`${vp.name}: horizontal scroll (${Math.max(m.docW, m.bodyW)} > ${m.vw})`);
  if (m.overflowing.length) fail(`${vp.name}: elements past the viewport edge: ${m.overflowing.join(', ')}`);
  if (m.small.length) fail(`${vp.name}: tap targets under 44px: ${m.small.join('; ')}`);
  if (m.minFont < 12) fail(`${vp.name}: smallest text ${m.minFont}px`);
  if (consoleErrors.length) fail(`${vp.name}: console errors: ${consoleErrors.join(' | ')}`);
  notes.push(`${vp.name}: width ${m.vw}, doc ${m.docW}, min font ${m.minFont}px, small targets ${m.small.length}`);
  await page.screenshot({ path: path.join(outputDir, `${vp.name}.png`), fullPage: true });
  await context.close();
}

// 2. Form: blocked without email, consent or price choice; mailto correct with all three.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(baseURL + route, { waitUntil: 'networkidle' });
  const email = 'qa.person@example.com';
  const choice = '£2.99 a month';
  const submit = () => page.getByRole('button', { name: 'Prepare waitlist email' }).click();
  const state = () => page.evaluate(() => ({
    valid: document.querySelector('#waitlist').checkValidity(),
    mailto: document.querySelector('#waitlist-mailto')?.getAttribute('href') ?? null,
  }));
  const reset = () => page.evaluate(() => { document.querySelector('#waitlist').reset(); document.querySelector('#waitlist-feedback').replaceChildren(); });

  const cases = [
    { label: 'nothing filled', fill: async () => {} },
    { label: 'no email', fill: async () => { await page.getByLabel(/^\s*I agree/).check(); await page.getByLabel(choice).check(); } },
    { label: 'no consent', fill: async () => { await page.locator('#email').fill(email); await page.getByLabel(choice).check(); } },
    { label: 'no price choice', fill: async () => { await page.locator('#email').fill(email); await page.getByLabel(/^\s*I agree/).check(); } },
    { label: 'invalid email', fill: async () => { await page.locator('#email').fill('not-an-email'); await page.getByLabel(/^\s*I agree/).check(); await page.getByLabel(choice).check(); } },
  ];
  for (const c of cases) {
    await reset();
    await c.fill();
    await submit();
    const s = await state();
    if (s.valid || s.mailto) fail(`form (${c.label}): submit was not blocked (valid=${s.valid}, mailto=${s.mailto})`);
  }

  await reset();
  await page.locator('#email').fill(email);
  await page.getByLabel(choice).check();
  await page.getByLabel(/^\s*I agree/).check();
  await submit();
  const s = await state();
  if (!s.mailto) {
    fail('form (complete): no mailto generated');
  } else {
    const consentText = (await page.locator('#consent-text').textContent()).trim();
    const url = new URL(s.mailto);
    const body = url.searchParams.get('body') ?? '';
    const checks = {
      protocol: url.protocol === 'mailto:',
      address: decodeURIComponent(url.pathname) === 'hello@plutonightlabs.com',
      subject: url.searchParams.get('subject') === 'Actby waitlist',
      email: body.includes(`Email: ${email}`),
      choice: body.includes(`Which would you pick?: ${choice}`),
      consent: consentText.length > 40 && body.includes(consentText),
    };
    for (const [k, ok] of Object.entries(checks)) if (!ok) fail(`form (complete): mailto ${k} wrong: ${s.mailto}`);
    notes.push(`mailto: to=${decodeURIComponent(url.pathname)} subject=${url.searchParams.get('subject')}`);
    notes.push(`mailto body: ${JSON.stringify(body)}`);
  }
  // each of the five options produces its own choice
  for (const label of ['Free (up to 8 items)', '£2.99 a month', '£24.99 a year', '£14.99 once', 'Wouldn’t pay']) {
    await reset();
    await page.locator('#email').fill(email);
    await page.getByLabel(label).check();
    await page.getByLabel(/^\s*I agree/).check();
    await submit();
    const body = new URL((await state()).mailto ?? 'mailto:x@y').searchParams.get('body') ?? '';
    if (!body.includes(`Which would you pick?: ${label}`)) fail(`form option "${label}" missing from mailto body`);
  }
  await context.close();
}

// 3. axe on /actby/ at mobile and desktop (serious + critical must be zero).
if (!axePath) {
  fail('axe: AXE_PATH not set (point it at an existing axe.min.js)');
} else {
  const axeSource = await readFile(axePath, 'utf8');
  for (const vp of [viewports[1], viewports[3]]) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await page.goto(baseURL + route, { waitUntil: 'networkidle' });
    await page.evaluate(axeSource);
    const result = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }));
    const bad = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    for (const v of bad) fail(`axe ${vp.name} ${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    const minor = result.violations.filter((v) => !bad.includes(v));
    notes.push(`axe ${vp.name} (${result.testEngine.name} ${result.testEngine.version}): ${result.violations.length} violations, ${bad.length} serious/critical${minor.length ? ' (other: ' + minor.map((v) => `${v.id}/${v.impact}`).join(', ') + ')' : ''}; ${result.passes.length} rules passed`);
    await context.close();
  }
}

await browser.close();
console.log(notes.join('\n'));
if (failures.length) {
  console.error('\nFAIL\n' + failures.map((f) => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log('\nPASS (browser viewport + automated; not physical-device evidence)');
