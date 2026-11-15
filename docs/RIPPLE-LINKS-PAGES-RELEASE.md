# Ripple Links privacy and support pages — production release packet (PLUTO-CF-002)

**Prepared:** 15 Nov 2026. **Status:** ready, **not pushed, not deployed.** Needs the owner's exact approval phrase below.

## What changes
- `src/pages/ripple-links/privacy.astro`: replaces the 9 Nov 2026 page (written for the older "proposed" ad set-up and "Remove Ads Forever"). The new page is the REL-06A text: no ATT, non-personalised ads for every player, UMP consent in the UK, EEA and Switzerland, "Remove Ads", progress stored on the device. Last updated 15 November 2026.
- `src/pages/ripple-links/support.astro`: **new** route `/ripple-links/support/`.
- No other route, asset, navigation or config changes. Screenshots are in `docs/screenshots/ripple-rel-06a/`.

**Precondition met:** the privacy text must not go live before Ripple Links REL-06 makes every ad request non-personalised. REL-06 passed on 15 Nov 2026, including the owner's iPhone. Production is internal TestFlight build 1.0 (2) (game repo `docs/studies/RIPPLE-REL-06-REPORT.md` and `RIPPLE-REL-07-REPORT.md`).

## Preflight evidence (15 Nov 2026, about 20:50 UTC)
| Check | Result |
|---|---|
| Site repo / target | `pluto-night-labs-site`; Worker `pluto-night-labs-site` (static assets from `dist/`, `wrangler.jsonc`) |
| Remote `main` after `git fetch` | `a64f2fa` (= local `main`) |
| Release branch | `feat/ripple-links-app-store-pages` = `a64f2fa` + `c50c3fd` (and this packet's commit): a **fast-forward** of `origin/main` |
| Production versus `main` | Every live route was byte-compared with the local build. **All 22 non-Ripple pages are identical** (`/`, `/about/`, `/contact/`, `/games/`, `/lab/`, `/last-train-home/`, `/last-train-home/privacy/`, `/microgames/`, `/playtests/` and its 4 subpages, `/privacy/`, `/products/`, `/shelfpick/` and `/privacy/`, `/support/`, `/terms/`, `/software/`, `/team/`, `/usagegrid/`), as are `robots.txt`, `favicon.svg` and `sitemap-index.xml`. No production-only content was found. Only `/ripple-links/privacy/` differs (old page live) and `/ripple-links/support/` is 404 live |
| Other working-tree changes | The canonical checkout's `main` has someone else's uncommitted `AGENTS.md` edit and `docs/screenshots/` files. These are docs only, not site content, and are not part of this release |
| `npm run build` (astro check + build) | 0 errors, 0 warnings, 0 hints; 21 pages |
| `scripts/prelaunch-qa.mjs` (output to scratch) | No overflow or console errors on the checked routes. 6 failures, all about `/products/shelfpick/` and `/products/usagegrid/` detail pages that no longer exist in `main` or production (removed by e614692). **The QA script is out of date and these failures are not caused by this change**; worth a separate fix |
| Ripple routes on the local preview | Both 200; privacy shows "Last updated: 15 November 2026"; support email present; no "Remove Ads Forever" |
| Not served anywhere yet | `/app-ads.txt` (AdMob may ask for it later; separate change) |

## Approval bundle (one phrase covers steps 1–6, in order)
Owner replies exactly: **`Deploy Ripple Links pages: push feat/ripple-links-app-store-pages to main and wrangler deploy`**. The agent states the branch head SHA when asking, and step 1 refuses if the head has changed since.

1. `git fetch origin`. **Stop** if `origin/main` is no longer `a64f2fa`: rebase, rebuild, rerun the checks and re-ask.
2. Fast-forward push of the release branch to `origin/main` (no force).
3. Fresh clean worktree at the new `origin/main`. `npm run build` must pass again.
4. Race check immediately before deploy:
   - `git ls-remote origin refs/heads/main` equals the build commit;
   - `npx wrangler deployments list` (read) records the current live version ID;
   - live pages still match `a64f2fa`, rechecked quickly on `/`, `/last-train-home/privacy/` and `/shelfpick/privacy/`.

   **Stop** if anything has moved.
5. `npx wrangler deploy` from that worktree.
6. Post-deploy proof:
   - Git SHA, Cloudflare version ID, deploy time;
   - live HTTP 200 and content checks on `/ripple-links/privacy/` (15 Nov text) and `/ripple-links/support/`;
   - every other route byte-identical to the build, including the preserved legal pages `/privacy/`, `/last-train-home/privacy/`, `/shelfpick/privacy/`, `/shelfpick/terms/` and `/shelfpick/support/`.

   Record everything in this file.

**Cost:** none. **Exclusions:** no other site changes, no DNS, no Cloudflare project changes, no deletion of old deployments.
**Rollback:** only with separate rollback approval, to the previous version ID recorded in step 4 (CF-002 §7).

## Release record (15 Nov 2026) — owner approval `Deploy Ripple Links pages: push feat/ripple-links-app-store-pages to main and wrangler deploy`
| Step | Result |
|---|---|
| 1 Freshness | `origin/main` `a64f2fa` (unchanged); branch head `f5286ac`; tree clean; fast-forward |
| 2 Git pushed | `a64f2fa..f5286ac` to `origin/main`, no force |
| 3 Clean rebuild | Fresh detached worktree at `f5286ac`; dependencies unchanged since `a64f2fa`; `npm run build` 0 errors, 0 warnings, 0 hints, 21 pages |
| 4 Race check | Remote `main` = build `f5286ac`. Live version before: `dde97712-98cc-4d47-aff4-400a419cf2be` (deployed 2026-11-14 20:08 UTC; nothing newer). Live `/`, `/last-train-home/privacy/` and `/shelfpick/privacy/` byte-identical to the build |
| 5 Cloudflare deployed | 20:53:22 UTC, `npx wrangler deploy`. Worker `pluto-night-labs-site`; 3 assets changed (`/sitemap-0.xml`, `/ripple-links/privacy/index.html`, `/ripple-links/support/index.html`), 90 unchanged. **Version `5a78e87c-2d12-432b-a102-f97f32810c59`** |
| 6 Live verified | 20:53:53 UTC on https://plutonightlabs.com: **all 24 routes HTTP 200 and byte-identical to the build**, including the preserved legal pages `/privacy/`, `/last-train-home/privacy/`, `/shelfpick/privacy/`, `/shelfpick/terms/` and `/shelfpick/support/`; `robots.txt` and `sitemap-0.xml` identical. `/ripple-links/privacy/` shows "Last updated: 15 November 2026" and "non-personalised ads only"; `/ripple-links/support/` is live and links to `/ripple-links/privacy/` |

**Rollback (separate approval only):** previous version `dde97712-98cc-4d47-aff4-400a419cf2be`.
This record is committed on the release branch after the deploy. It reaches `main` only with a further docs-only push.
